import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/server";

// Render-compatible replacement for netlify/functions/release-stale.mjs (a Netlify Scheduled Function,
// which does not run on Render). Call this route on a schedule instead — see README.md "Scheduling the
// stale-order release job on Render" for how to point a Render Cron Job at it.
//
// GET only (the method a Render Cron Job sends). Every other method 404s automatically because no other
// handler is exported from this file.
export const dynamic = "force-dynamic";

/** Fixed-length digest compare: timing-safe, and never throws on mismatched input lengths. */
function secureEqual(a, b) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fails closed: with no secret configured, nobody can authenticate, so nobody can trigger the job.
    console.error("[cron/release-stale] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!provided || !secureEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[cron/release-stale] Supabase service role is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // Same floor and default as the existing Netlify function (netlify/functions/release-stale.mjs):
  // never below 60 minutes, defaulting to 1440 (24h) because bKash payments are verified manually.
  // STALE_ORDER_MINUTES is the one existing config knob for this job; this route doesn't add a new one.
  const configured = Number(process.env.STALE_ORDER_MINUTES);
  const minutes = Math.max(60, Number.isFinite(configured) && configured > 0 ? configured : 1440);

  const { data, error } = await supabaseAdmin().rpc("release_stale_orders", { p_minutes: minutes });

  if (error) {
    // Log only the error code/message, never request/customer/order data.
    console.error("[cron/release-stale] release_stale_orders failed", error.code, error.message);
    return NextResponse.json({ error: "Release job failed." }, { status: 500 });
  }

  // release_stale_orders() returns the count of orders it released (an int), nothing order- or customer-specific.
  return NextResponse.json({ released: data ?? 0 });
}
