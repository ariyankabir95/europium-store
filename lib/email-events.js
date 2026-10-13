import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";
const CLAIM_LEASE_MS = 5 * 60 * 1000;

/**
 * Atomically claims a new email event. The payload is persisted before sending.
 * Gmail SMTP has no provider idempotency API, so stale ambiguous sends require human review.
 */
export async function claimOrderEmail(orderId, type, payload) {
  const db = supabaseAdmin();
  // Retained as an internal event identifier for schema compatibility. Gmail SMTP has no
  // provider idempotency API, so ambiguous sends must never be automatically replayed.
  const idempotencyKey = `europium-order-email/${type}/${orderId}`;
  const { error: insertError } = await db.from("order_email_events").insert({
    order_id: orderId, event_type: type, status: "sending", payload,
    idempotency_key: idempotencyKey, attempt_count: 1,
  });
  if (!insertError) return { claimed: true, payload, idempotencyKey };
  if (insertError.code !== UNIQUE_VIOLATION) {
    console.error("[email] could not record event", type, insertError.code, insertError.message);
    return null;
  }
  const { data: existing, error: readError } = await db
    .from("order_email_events").select("status,updated_at")
    .eq("order_id", orderId).eq("event_type", type).maybeSingle();
  if (readError || !existing) {
    if (readError) console.error("[email] could not read event", type, readError.code, readError.message);
    return null;
  }
  if (existing.status !== "sending") return null;
  const updatedAt = Date.parse(existing.updated_at);
  if (!Number.isFinite(updatedAt) || updatedAt > Date.now() - CLAIM_LEASE_MS) return null;
  // Gmail may have accepted the message before a process crash. Do not replay it automatically.
  await markOrderEmailNeedsReview(orderId, type);
  return null;
}

export async function markOrderEmailSent(orderId, type, providerId) {
  const { error } = await supabaseAdmin()
    .from("order_email_events")
    .update({ status: "sent", provider_id: providerId, updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("event_type", type)
    .eq("status", "sending");
  if (error) console.error("[email] could not mark event sent", type, error.code, error.message);
}

export async function markOrderEmailNeedsReview(orderId, type) {
  const { error } = await supabaseAdmin()
    .from("order_email_events")
    .update({ status: "needs_review", updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("event_type", type)
    .eq("status", "sending");
  if (error) console.error("[email] could not flag event for review", type, error.code, error.message);
}
