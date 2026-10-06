import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
const UNIQUE_VIOLATION = "23505";
/**
 * Claims an email event before sending. Returns true only for the first caller: the unique (order_id, event_type)
 * constraint rejects every later attempt, so a repeated save, a retry, or two admins acting at once cannot
 * send the same email twice. Returns false if the event was already claimed or the database is unavailable
 * (fail closed, so an outage never produces duplicates).
 */
export async function claimOrderEmail(orderId, type) {
    const { error } = await supabaseAdmin()
        .from("order_email_events")
        .insert({ order_id: orderId, event_type: type, status: "sending" });
    if (!error)
        return true;
    if (error.code !== UNIQUE_VIOLATION)
        console.error("[email] could not record event", type, error.code, error.message);
    return false;
}
export async function markOrderEmailSent(orderId, type, providerId) {
    const { error } = await supabaseAdmin()
        .from("order_email_events")
        .update({ status: "sent", provider_id: providerId, updated_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .eq("event_type", type);
    if (error)
        console.error("[email] could not mark event sent", type, error.code, error.message);
}
/** Removes a claim after a failed send so a later genuine change can try again. */
export async function releaseOrderEmailClaim(orderId, type) {
    const { error } = await supabaseAdmin()
        .from("order_email_events")
        .delete()
        .eq("order_id", orderId)
        .eq("event_type", type)
        .eq("status", "sending");
    if (error)
        console.error("[email] could not release claim", type, error.code, error.message);
}
