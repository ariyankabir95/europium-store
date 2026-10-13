import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/server";
import {
  sendOrderPlacedEmail,
  sendPaymentReceivedEmail,
  sendOrderStatusEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

function secureEqual(a, b) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Scheduled every 5 minutes by the hosting provider.
 * Retries only ambiguous sends within Resend's 24-hour idempotency window.
 * Older ambiguous rows are marked needs_review rather than risking duplicate delivery.
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/retry-order-emails] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!provided || !secureEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[cron/retry-order-emails] Supabase service role is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const leaseCutoff = new Date(now - 5 * 60 * 1000).toISOString();
  const retryCutoff = new Date(now - 20 * 60 * 60 * 1000).toISOString();

  // After 20 hours the provider's 24-hour idempotency guarantee is too close to expiry.
  // Mark ambiguous events for human review instead of automatically risking a duplicate.
  const { data: expired, error: expiredError } = await db
    .from("order_email_events")
    .update({ status: "needs_review", updated_at: new Date().toISOString() })
    .eq("status", "sending")
    .lt("updated_at", leaseCutoff)
    .lt("created_at", retryCutoff)
    .select("id");

  if (expiredError) {
    console.error("[cron/retry-order-emails] could not flag expired events", expiredError.code, expiredError.message);
    return NextResponse.json({ error: "Email recovery query failed." }, { status: 500 });
  }

  const { data: stale, error: staleError } = await db
    .from("order_email_events")
    .select("order_id,event_type")
    .eq("status", "sending")
    .lt("updated_at", leaseCutoff)
    .gt("created_at", retryCutoff)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (staleError) {
    console.error("[cron/retry-order-emails] could not load stale events", staleError.code, staleError.message);
    return NextResponse.json({ error: "Email recovery query failed." }, { status: 500 });
  }

  let attempted = 0;
  for (const event of stale ?? []) {
    attempted += 1;
    switch (event.event_type) {
      case "order_placed":
        await sendOrderPlacedEmail(event.order_id);
        break;
      case "payment_received":
        await sendPaymentReceivedEmail(event.order_id);
        break;
      case "order_confirmed":
        await sendOrderStatusEmail(event.order_id, "confirmed");
        break;
      case "order_processing":
        await sendOrderStatusEmail(event.order_id, "processing");
        break;
      case "order_shipped":
        await sendOrderStatusEmail(event.order_id, "shipped");
        break;
      case "order_delivered":
        await sendOrderStatusEmail(event.order_id, "delivered");
        break;
      case "order_cancelled":
        await sendOrderStatusEmail(event.order_id, "cancelled");
        break;
      case "order_refunded":
        await sendOrderStatusEmail(event.order_id, "refunded");
        break;
      default:
        console.error("[cron/retry-order-emails] unsupported event type");
    }
  }

  return NextResponse.json({
    attempted,
    flaggedForReview: expired?.length ?? 0,
  });
}
