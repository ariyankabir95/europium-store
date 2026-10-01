import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { isEmail } from "@/lib/validate";
export async function POST(req: Request) {
  if (!hasSupabase()) return NextResponse.json({ error: "Subscriptions are not available yet." }, { status: 503 });
  const b = await req.json().catch(() => null); const email = String(b?.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const { error } = await (await supabaseServer()).from("newsletter_subscribers").insert({ email });
  if (error && error.code !== "23505") return NextResponse.json({ error: "Could not subscribe. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
