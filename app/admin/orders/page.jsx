import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
import { sendOrderStatusEmail, sendPaymentReceivedEmail } from "@/lib/email";
import OrderStatusForm from "@/components/admin/OrderStatusForm";

const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"], PAY = ["unpaid", "paid", "failed", "refunded"];

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

export default async function Orders() {
  const sb = await requireAdmin();
  const { data: orders, error } = await sb
    .from("orders")
    .select("id,email,status,payment_status,payment_method,payment_reference,tracking_number,total_cents,created_at,shipping_address")
    .order("created_at", { ascending: false })
    .limit(100);

  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: orderItems, error: itemsError } = orderIds.length
    ? await sb.from("order_items").select("id,order_id,name,unit_price_cents,quantity").in("order_id", orderIds).order("id", { ascending: true })
    : { data: [], error: null };

  const itemsByOrder = new Map();
  for (const item of orderItems ?? []) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }

  const sel = "min-h-11 border border-sand bg-transparent px-2";
  return (
    <>
      <h1 className="mb-2 font-serif text-4xl">Orders</h1>
      <p className="mb-6 text-sm text-taupe">Latest 100 orders. Open “Order details” to see products, quantities, prices and shipping information.</p>
      {error && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Could not load orders. Please refresh or check the server logs.</p>}
      {itemsError && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Order products could not be loaded. The order status controls remain available.</p>}
      {!orders?.length ? <p className="text-umber">No orders yet.</p> : (
        <ul className="divide-y divide-sand border-y border-sand text-sm">
          {orders.map((o) => {
            const items = itemsByOrder.get(o.id) ?? [];
            const address = displayAddress(o.shipping_address);
            return (
              <li key={o.id} className="py-5">
                <p className="mb-2 font-medium">#{o.id.slice(0, 8)} · {o.email} · {money(o.total_cents / 100, "BDT")} · {new Date(o.created_at).toLocaleDateString("en-GB")}</p>
                <p className="mb-3 text-xs text-taupe">Payment: {o.payment_method === "bkash_manual" ? "bKash manual" : "Not set"}{o.payment_reference ? ` · TrxID: ${o.payment_reference}` : ""}</p>

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
                  </div>
                </details>

                <OrderStatusForm order={o} action={update} statusOptions={STATUS} payOptions={PAY} selectClass={sel}/>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
