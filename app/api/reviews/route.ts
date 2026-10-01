import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
export async function POST(req: Request) {
  const fail = (e: string, s: number) => NextResponse.json({ error: e }, { status: s });
  if (!hasSupabase()) return fail("Reviews are not available yet.", 503);
  const b = await req.json().catch(() => null); const rating = Math.trunc(Number(b?.rating)), body = String(b?.body ?? "").trim().slice(0, 2000), slug = String(b?.slug ?? "");
  if (!(rating >= 1 && rating <= 5) || body.length < 10) return fail("Choose a rating and write at least 10 characters.", 400);
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) return fail("Sign in to leave a review.", 401);
  const { data: p } = await sb.from("products").select("id").eq("slug", slug).single(); if (!p) return fail("Product not found.", 404);
  const { error } = await sb.from("reviews").insert({ product_id: p.id, user_id: user.id, rating, body, status: "pending" });
  return error ? fail("Could not save your review.", 500) : NextResponse.json({ ok: true });
}
