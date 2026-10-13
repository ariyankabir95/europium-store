import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
import { sendOrderPlacedEmail, sendOrderStatusEmail, sendPaymentReceivedEmail } from "@/lib/email";
import OrderStatusForm from "@/components/admin/OrderStatusForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import { back } from "@/lib/cms-admin";

const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"], PAY = ["unpaid", "paid", "failed", "refunded"];
const STATUS_EMAIL_EVENT = {
  confirmed: "order_confirmed",
  processing: "order_processing",
  shipped: "order_shipped",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
  refunded: "order_refunded",
};

// Mirrors the error.message.includes(...) mapping already used for RPC errors in app/api/checkout/route.js.
function statusErrorMessage(error) {
  if (error.message.includes("insufficient_stock")) return "Can't set this status: not enough stock is available to fulfill this order right now.";
  if (error.message.includes("invalid_stock_transition")) return "This order has already committed stock for shipment. Use the return/refund workflow instead of moving it back to pre-shipment.";
  if (error.message.includes("forbidden")) return "You don't have permission to change this order.";
  if (error.message.includes("invalid_status")) return "That status isn't valid.";
  if (error.message.includes("invalid_payment_status")) return "That payment status isn't valid.";
  if (error.message.includes("not_found")) return "This order could not be found.";
  return "Couldn't update the order. Please try again.";
}

function displayAddress(address) {
  if (!address || typeof address !== "object" || Array.isArray(address)) return [];
  return Object.entries(address)
    .filter(([, value]) => (typeof value === "string" || typeof value === "number") && String(value).trim())
    .map(([key, value]) => [key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), String(value)]);
}

async function update(prevState, fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id"), status = str(fd, "status"), pay = str(fd, "payment_status"), tracking = str(fd, "tracking", 100) || null;
  if (!uuid(id) || !STATUS.includes(status) || !PAY.includes(pay)) return { error: "Invalid input." };

  const { data: before } = await sb.from("orders").select("status,payment_status").eq("id", id).maybeSingle();
  // Status, payment status and tracking are committed by one Postgres RPC transaction.
  const { error: statusError } = await sb.rpc("admin_set_order_status", { p_order: id, p_status: status, p_payment_status: pay, p_tracking: tracking });
  revalidatePath("/admin/orders");
  if (statusError) return { error: statusErrorMessage(statusError) };

  // Read back the committed state. Email errors must never undo a successful order update.
  const { data: after } = await sb.from("orders").select("status,payment_status").eq("id", id).maybeSingle();
  if (before && after) {
    if (before.payment_status !== "paid" && after.payment_status === "paid") await sendPaymentReceivedEmail(id);
    if (before.status !== after.status) await sendOrderStatusEmail(id, after.status);
  }
  return { error: null };
}

async function trashOrder(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  if (!uuid(id)) back("/admin/orders", "error", "Invalid order ID.");

  const { error } = await sb.rpc("admin_set_order_trashed", { p_order: id, p_trashed: true });
  if (error) {
    console.error("[admin/orders] trash action failed", error.code);
    const message = error.message?.includes("order_not_trashable")
      ? "This order cannot be trashed because it may be paid or already in fulfillment. Keep it in Orders."
      : "Could not move this order to Trash. Check the database migration and try again.";
    back("/admin/orders", "error", message);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/trash");
  back("/admin/orders", "ok", "Order moved to Trash. You can restore it from Admin → Trash.");
}

async function retryOrderPlacedEmail(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  if (!uuid(id)) return;

  const { data: order } = await sb.from("orders").select("id").eq("id", id).maybeSingle();
  if (!order) return;

  // Only retry when no order_placed event exists. Existing claims are never bypassed.
  const { data: existing, error } = await sb
    .from("order_email_events")
    .select("id")
    .eq("order_id", id)
    .eq("event_type", "order_placed")
    .maybeSingle();
  if (error) {
    console.error("[admin/orders] could not check order email event", error.code);
    return;
  }
  if (existing) return;

  await sendOrderPlacedEmail(id);
  revalidatePath("/admin/orders");
}

async function retryCurrentStatusEmail(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  if (!uuid(id)) return;

  const { data: order, error: orderError } = await sb
    .from("orders")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (orderError || !order) return;

  const eventType = STATUS_EMAIL_EVENT[order.status];
  if (!eventType) return;

  // Never bypass an existing claim: it may represent a successful or ambiguous provider send.
  const { data: existing, error } = await sb
    .from("order_email_events")
    .select("id")
    .eq("order_id", id)
    .eq("event_type", eventType)
    .maybeSingle();
  if (error) {
    console.error("[admin/orders] could not check status email event", error.code);
    return;
  }
  if (existing) return;

  await sendOrderStatusEmail(id, order.status);
  revalidatePath("/admin/orders");
}

export default async function Orders() {
  const sb = await requireAdmin();
  const { data: orders, error } = await sb
    .from("orders")
    .select("id,email,status,payment_status,payment_method,payment_reference,tracking_number,total_cents,created_at,shipping_address")
    .is("trashed_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: orderItems, error: itemsError } = orderIds.length
    ? await sb.from("order_items").select("id,order_id,name,unit_price_cents,quantity").in("order_id", orderIds).order("id", { ascending: true })
    : { data: [], error: null };
  const { data: emailEvents, error: emailEventsError } = orderIds.length
    ? await sb.from("order_email_events").select("order_id,event_type,status,updated_at").in("order_id", orderIds).order("created_at", { ascending: true })
    : { data: [], error: null };

  const emailEventsByOrder = new Map();
  for (const event of emailEvents ?? []) {
    if (!emailEventsByOrder.has(event.order_id)) emailEventsByOrder.set(event.order_id, []);
    emailEventsByOrder.get(event.order_id).push(event);
  }

  const itemsByOrder = new Map();
  for (const item of orderItems ?? []) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }

  const sel = "min-h-11 border border-sand bg-transparent px-2";
  return (
    <>
      <h1 className="mb-2 font-serif text-4xl">Orders</h1>
      <Flash ok={undefined} error={undefined} />
      <p className="mb-3 text-sm text-taupe">Latest 100 active orders. Open “Order details” to see products, quantities, prices and shipping information.</p>
      <p className="mb-6 text-sm"><a href="/admin/trash" className="underline">View Trash / restore items</a></p>
      {error && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Could not load orders. Please refresh or check the server logs.</p>}
      {itemsError && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Order products could not be loaded. The order status controls remain available.</p>}
      {emailEventsError && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Email event status could not be loaded. Check the email recovery migration and database logs.</p>}
      {!orders?.length ? <p className="text-umber">No orders yet.</p> : (
        <ul className="divide-y divide-sand border-y border-sand text-sm">
          {orders.map((o) => {
            const items = itemsByOrder.get(o.id) ?? [];
            const address = displayAddress(o.shipping_address);
            const orderEvents = emailEventsByOrder.get(o.id) ?? [];
            const currentStatusEvent = STATUS_EMAIL_EVENT[o.status];
            const hasCurrentStatusEvent = currentStatusEvent && orderEvents.some((event) => event.event_type === currentStatusEvent);
            return (
              <li key={o.id} className="py-5">
                <p className="mb-2 font-medium">#{o.id.slice(0, 8)} · {o.email} · {money(o.total_cents / 100, "BDT")} · {new Date(o.created_at).toLocaleDateString("en-GB")}</p>
                <p className="mb-3 text-xs text-taupe">Payment: {o.payment_method === "bkash_manual" ? "bKash manual" : o.payment_method === "cod" ? "Cash on Delivery" : "Not set"}{o.payment_reference ? ` · TrxID: ${o.payment_reference}` : ""}</p>

                <details className="mb-4 border border-sand px-3 py-3">
                  <summary className="cursor-pointer font-medium">Order details · {items.length} {items.length === 1 ? "item" : "items"}</summary>
                  <div className="mt-3 space-y-3">
                    {!items.length ? <p className="text-sm text-taupe">No order items were found for this order.</p> : (
                      <ul className="divide-y divide-sand">
                        {items.map((item) => (
                          <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                            <div className="min-w-0">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-taupe">Qty: {item.quantity} × {money(item.unit_price_cents / 100, "BDT")}</p>
                            </div>
                            <p className="shrink-0 font-medium">{money((item.unit_price_cents * item.quantity) / 100, "BDT")}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {address.length > 0 && (
                      <section className="border-t border-sand pt-3">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider">Shipping address</h3>
                        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                          {address.map(([label, value]) => <div key={label + value} className="flex gap-2"><dt className="text-taupe">{label}:</dt><dd className="break-words">{value}</dd></div>)}
                        </dl>
                      </section>
                    )}
                    {o.tracking_number && <p className="border-t border-sand pt-3 text-xs">Tracking: {o.tracking_number}</p>}
                    <section className="border-t border-sand pt-3">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider">Transactional email events</h3>
                      {!orderEvents.length ? (
                        <p className="text-xs text-taupe">No order email events recorded.</p>
                      ) : (
                        <ul className="space-y-2">
                          {orderEvents.map((event) => {
                            const labels = {
                              order_placed: "Order placed",
                              payment_received: "Payment received",
                              order_confirmed: "Order confirmed",
                              order_processing: "Order processing",
                              order_shipped: "Order shipped",
                              order_delivered: "Order delivered",
                              order_cancelled: "Order cancelled",
                              order_refunded: "Order refunded",
                            };
                            const state = event.status === "sent"
                              ? "Provider accepted"
                              : event.status === "needs_review"
                                ? "Needs review — check provider logs before any manual resend"
                                : "Sending / retry pending";
                            return (
                              <li key={event.event_type} className="flex flex-wrap justify-between gap-2 text-xs">
                                <span>{labels[event.event_type] ?? event.event_type}</span>
                                <span className={event.status === "needs_review" ? "font-medium text-red-800" : "text-taupe"}>
                                  {state} · {new Date(event.updated_at).toLocaleString("en-GB")}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {!orderEvents.some((event) => event.event_type === "order_placed") && (
                        <form action={retryOrderPlacedEmail} className="mt-3">
                          <input type="hidden" name="id" value={o.id} />
                          <button type="submit" className="border border-umber px-3 py-2 text-xs font-medium hover:bg-sand">
                            Send order confirmation email
                          </button>
                        </form>
                      )}
                      {currentStatusEvent && !hasCurrentStatusEvent && (
                        <form action={retryCurrentStatusEmail} className="mt-3">
                          <input type="hidden" name="id" value={o.id} />
                          <button type="submit" className="border border-umber px-3 py-2 text-xs font-medium hover:bg-sand">
                            Send missing “{o.status}” status email
                          </button>
                        </form>
                      )}
                    </section>
                  </div>
                </details>

                <OrderStatusForm order={o} action={update} statusOptions={STATUS} payOptions={PAY} selectClass={sel}/>
                {["pending", "cancelled"].includes(o.status) && o.payment_status !== "paid" && (
                  <form action={trashOrder} className="mt-3">
                    <input type="hidden" name="id" value={o.id} />
                    <ConfirmButton
                      message="Move this pending/cancelled order to Trash? It will be hidden from active Orders and can be restored later. Pending stock reservations will be released."
                      className="border border-red-800 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-50"
                    >
                      Move to Trash
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
