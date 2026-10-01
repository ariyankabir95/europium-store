import { supabaseAdmin } from "@/lib/supabase/admin";
// Payment-ready architecture. Real processing stays OFF until an adapter is implemented AND credentials are set.
export type PaymentEvent = { orderId: string; status: "paid" | "failed" | "refunded" };
export interface PaymentProvider {
  name: string;
  createSession(orderId: string, amountCents: number, email: string): Promise<{ url: string }>;
  /** Must verify the provider's signature with PAYMENT_WEBHOOK_SECRET; return null if invalid. */
  verifyWebhook(rawBody: string, headers: Headers): PaymentEvent | null;
}
export function paymentProvider(): PaymentProvider | null {
  if (!process.env.PAYMENT_PROVIDER || !process.env.PAYMENT_SECRET_KEY) return null;
  // TODO: return the adapter for PAYMENT_PROVIDER. No adapter exists yet, so payments are disabled.
  return null;
}
/** Only called after verifyWebhook succeeds. Idempotent: a paid order is never downgraded except by an explicit refund. */
export async function applyPaymentEvent(e: PaymentEvent) {
  const sb = supabaseAdmin();
  if (e.status === "paid") await sb.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("id", e.orderId).eq("payment_status", "unpaid");
  else if (e.status === "failed") await sb.from("orders").update({ payment_status: "failed" }).eq("id", e.orderId).eq("payment_status", "unpaid");
  else await sb.from("orders").update({ payment_status: "refunded" }).eq("id", e.orderId).eq("payment_status", "paid");
}
