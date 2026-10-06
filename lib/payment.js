import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPaymentReceivedEmail } from "@/lib/email";
export function paymentProvider() {
    if (!process.env.PAYMENT_PROVIDER || !process.env.PAYMENT_SECRET_KEY)
        return null;
    // TODO: return the adapter for PAYMENT_PROVIDER. No adapter exists yet, so payments are disabled.
    return null;
}
/** Only called after verifyWebhook succeeds. Idempotent: a paid order is never downgraded except by an explicit refund. */
export async function applyPaymentEvent(e) {
    const sb = supabaseAdmin();
    if (e.status === "paid") {
        const { data } = await sb.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("id", e.orderId).eq("payment_status", "unpaid").select("id");
        // Only a real unpaid→paid transition sends the payment email. A replayed webhook changes nothing and sends nothing.
        if (data?.length)
            await sendPaymentReceivedEmail(e.orderId);
    }
    else if (e.status === "failed")
        await sb.from("orders").update({ payment_status: "failed" }).eq("id", e.orderId).eq("payment_status", "unpaid");
    else
        await sb.from("orders").update({ payment_status: "refunded" }).eq("id", e.orderId).eq("payment_status", "paid");
}
