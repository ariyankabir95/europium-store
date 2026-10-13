import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function requestAddress(req) {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 120);
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
    // Proxies append the connecting address. Prefer the final entry to reduce spoofing
    // from a client-supplied leading X-Forwarded-For value.
    if (entries.length) return entries[entries.length - 1].slice(0, 120);
  }
  return "unknown";
}

/**
 * Atomic DB-backed request limiter. Requires migration 0023 and server-only service-role env.
 * Only a SHA-256 hash is persisted; raw addresses never leave this function.
 */
export async function consumeRateLimit(req, scope, { limit, windowSeconds, identifier = "" }) {
  const keyHash = createHash("sha256")
    .update(`${scope}:${requestAddress(req)}:${identifier}`)
    .digest("hex");
  try {
    const { data, error } = await supabaseAdmin().rpc("consume_public_rate_limit", {
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] database check failed:", error.code);
      return { allowed: false, unavailable: true };
    }
    return { allowed: data === true, unavailable: false };
  } catch (error) {
    console.error("[rate-limit] database check unavailable");
    return { allowed: false, unavailable: true };
  }
}

export function rateLimitResponse(NextResponse, result) {
  if (result.unavailable) {
    return NextResponse.json(
      { error: "This service is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }
  return null;
}
