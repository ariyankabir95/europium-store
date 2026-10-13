import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";
const CLAIM_LEASE_MS = 5 * 60 * 1000;
const SAFE_RETRY_WINDOW_MS = 20 * 60 * 60 * 1000;
const MAX_SEND_ATTEMPTS = 5;

/**
 * Atomically claims a new event or leases a stale one for recovery.
 * The exact request payload and deterministic provider idempotency key are persisted before sending.
 * Retries stop before Resend's 24-hour idempotency window expires; older ambiguous events need review.
 */
export async function claimOrderEmail(orderId, type, payload) {
  const db = supabaseAdmin();
  const idempotencyKey = `europium-order-email/${type}/${orderId}`;
  const now = Date.now();
  const { error: insertError } = await db.from("order_email_events").insert({
    order_id: orderId,
    event_type: type,
    status: "sending",
    payload,
    idempotency_key: idempotencyKey,
    attempt_count: 1,
  });

  if (!insertError) return { claimed: true, payload, idempotencyKey };
  if (insertError.code !== UNIQUE_VIOLATION) {
    console.error("[email] could not record event", type, insertError.code, insertError.message);
    return null;
  }

  const { data: existing, error: readError } = await db
    .from("order_email_events")
    .select("status,payload,idempotency_key,attempt_count,created_at,updated_at")
    .eq("order_id", orderId)
    .eq("event_type", type)
    .maybeSingle();

  if (readError || !existing) {
    if (readError) console.error("[email] could not read event", type, readError.code, readError.message);
    return null;
  }
  if (existing.status !== "sending") return null;

  const leaseCutoff = new Date(now - CLAIM_LEASE_MS).toISOString();
  const retryCutoff = new Date(now - SAFE_RETRY_WINDOW_MS).toISOString();
  const createdAt = Date.parse(existing.created_at);
  const updatedAt = Date.parse(existing.updated_at);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null;

  // Do not interfere with a legacy send that may still be in progress; only flag it once its lease is stale.
  if (!existing.payload || !existing.idempotency_key) {
    if (updatedAt <= now - CLAIM_LEASE_MS) await markOrderEmailNeedsReview(orderId, type);
    return null;
  }

  // Cap retries so a prolonged provider outage cannot cause repeated requests indefinitely.
  if ((existing.attempt_count ?? 1) >= MAX_SEND_ATTEMPTS) {
    const { error } = await db
      .from("order_email_events")
      .update({ status: "needs_review", updated_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("event_type", type)
      .eq("status", "sending")
      .eq("attempt_count", existing.attempt_count ?? 1)
      .lt("updated_at", leaseCutoff);
    if (error) console.error("[email] could not flag exhausted event", type, error.code, error.message);
    return null;
  }

  // Resend retains idempotency keys for 24 hours. Stop automatic retries with a 4-hour safety margin.
  if (createdAt <= now - SAFE_RETRY_WINDOW_MS) {
    const { error } = await db
      .from("order_email_events")
      .update({ status: "needs_review", updated_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("event_type", type)
      .eq("status", "sending")
      .lt("updated_at", leaseCutoff);
    if (error) console.error("[email] could not flag expired event", type, error.code, error.message);
    return null;
  }

  // Conditional update acts as a lease: only one concurrent worker can reclaim this stale claim.
  const { data: reclaimed, error: reclaimError } = await db
    .from("order_email_events")
    .update({ updated_at: new Date().toISOString(), attempt_count: (existing.attempt_count ?? 1) + 1 })
    .eq("order_id", orderId)
    .eq("event_type", type)
    .eq("status", "sending")
    .eq("attempt_count", existing.attempt_count ?? 1)
    .lt("updated_at", leaseCutoff)
    .gt("created_at", retryCutoff)
    .select("payload,idempotency_key,attempt_count")
    .maybeSingle();

  if (reclaimError) {
    console.error("[email] could not reclaim event", type, reclaimError.code, reclaimError.message);
    return null;
  }
  if (!reclaimed) return null;
  return { claimed: true, payload: reclaimed.payload, idempotencyKey: reclaimed.idempotency_key };
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
