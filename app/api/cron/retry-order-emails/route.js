import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function secureEqual(a, b) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Scheduled every 5 minutes by the hosting provider.
 * Gmail SMTP has no idempotency API, so stale ambiguous sends are flagged for review instead of replayed.
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
  const leaseCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  // Gmail SMTP does not support provider idempotency. A stale event may already have been accepted.
  const { data: flagged, error } = await db
    .from("order_email_events")
    .update({ status: "needs_review", updated_at: new Date().toISOString() })
    .eq("status", "sending").lt("updated_at", leaseCutoff).select("id");
  if (error) {
    console.error("[cron/retry-order-emails] could not flag stale events", error.code, error.message);
    return NextResponse.json({ error: "Email recovery query failed." }, { status: 500 });
  }
  return NextResponse.json({
    attempted: 0,
    flaggedForReview: flagged?.length ?? 0,
    note: "Automatic SMTP retries are disabled to avoid duplicate customer emails.",
  });
}
