import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
import { sendOrderStatusEmail, sendPaymentReceivedEmail } from "@/lib/email";
import OrderStatusForm from "@/components/admin/OrderStatusForm";
const STATUS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"], PAY = ["unpaid", "paid", "failed", "refunded"];
// Mirrors the error.message.includes(...) mapping already used for RPC errors in app/api/checkout/route.js.
function statusErrorMessage(error) {
    if (error.message.includes("insufficient_stock"))
        return "Can't set this status: not enough stock is available to fulfill this order right now.";
    if (error.message.includes("forbidden"))
        return "You don't have permission to change this order.";
    if (error.message.includes("invalid_status"))
        return "That status isn't valid.";
    if (error.message.includes("invalid_payment_status"))
        return "That payment status isn't valid.";
    if (error.message.includes("not_found"))
        return "This order could not be found.";
    return "Couldn't update the order. Please try again.";
}
async function update(prevState, fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id"), status = str(fd, "status"), pay = str(fd, "payment_status"), tracking = str(fd, "tracking", 100) || null;
    if (!uuid(id) || !STATUS.includes(status) || !PAY.includes(pay))
        return { error: "Invalid input." };
    const { data: before } = await sb.from("orders").select("status,payment_status").eq("id", id).maybeSingle();
    // Order status, payment status and tracking number are committed by this one RPC call as a single
    // Postgres transaction (see supabase/migrations/0019_stale_order_safety.sql). If it errors -- e.g.
    // insufficient_stock -- NONE of the three are written; there is no separate, unconditional write
    // that could slip through on a failed status change.
    const { error: statusError } = await sb.rpc("admin_set_order_status", { p_order: id, p_status: status, p_payment_status: pay, p_tracking: tracking });
    revalidatePath("/admin/orders");
    if (statusError)
        return { error: statusErrorMessage(statusError) };
    // Read back what was actually saved, then email only real transitions. Saving an unchanged order sends nothing.
    // The senders never throw, and the order is already saved, so an email problem cannot undo or fail this save.
    const { data: after } = await sb.from("orders").select("status,payment_status").eq("id", id).maybeSingle();
    if (before && after) {
        if (before.payment_status !== "paid" && after.payment_status === "paid")
            await sendPaymentReceivedEmail(id);
        if (before.status !== after.status)
            await sendOrderStatusEmail(id, after.status);
    }
    return { error: null };
}
export default async function Orders() {
    const sb = await requireAdmin();
    const { data } = await sb.from("orders").select("id,email,status,payment_status,payment_method,payment_reference,tracking_number,total_cents,created_at").order("created_at", { ascending: false }).limit(100);
    const sel = "min-h-11 border border-sand bg-transparent px-2";
    return (<><h1 className="mb-6 font-serif text-4xl">Orders</h1>{!data?.length ? <p className="text-umber">No orders yet.</p> : <ul className="divide-y divide-sand border-y border-sand text-sm">{data.map((o) => (<li key={o.id} className="py-4"><p className="mb-2">#{o.id.slice(0, 8)} · {o.email} · {money(o.total_cents / 100, "BDT")} · {new Date(o.created_at).toLocaleDateString("en-US")}</p>
      <p className="mb-2 text-xs text-taupe">Payment: {o.payment_method === "bkash_manual" ? "bKash manual" : "Not set"}{o.payment_reference ? ` · TrxID: ${o.payment_reference}` : ""}</p>
      <OrderStatusForm order={o} action={update} statusOptions={STATUS} payOptions={PAY} selectClass={sel}/></li>))}</ul>}</>);
}
