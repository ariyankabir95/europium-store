import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
async function ctx() { if (!hasSupabase()) return null; const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); return user ? { sb, user } : null; }
export async function GET() {
  const c = await ctx(); if (!c) return NextResponse.json({ error: "guest" }, { status: 401 });
  const { data } = await c.sb.from("wishlist_items").select("products(slug)").eq("user_id", c.user.id);
  return NextResponse.json({ slugs: (data ?? []).map((r) => (r.products as unknown as { slug: string } | null)?.slug).filter(Boolean) });
}
/** Replaces the signed-in user's wishlist with the given slugs. RLS limits every row to the owner. */
export async function POST(req: Request) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: "guest" }, { status: 401 });
  const b = await req.json().catch(() => null); const slugs: string[] = Array.isArray(b?.slugs) ? b.slugs.slice(0, 200).map(String) : [];
  const { data: ps } = slugs.length ? await c.sb.from("products").select("id").in("slug", slugs) : { data: [] }; const ids = (ps ?? []).map((p) => p.id);
  const del = c.sb.from("wishlist_items").delete().eq("user_id", c.user.id); await (ids.length ? del.not("product_id", "in", `(${ids.join(",")})`) : del);
  if (ids.length) await c.sb.from("wishlist_items").upsert(ids.map((product_id) => ({ user_id: c.user.id, product_id })));
  return NextResponse.json({ ok: true });
}
