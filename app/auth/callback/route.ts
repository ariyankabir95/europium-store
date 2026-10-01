import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url); const code = searchParams.get("code");
  if (code) { const sb = await supabaseServer(); await sb.auth.exchangeCodeForSession(code); }
  const n = searchParams.get("next") ?? "/account";
  return NextResponse.redirect(`${origin}${n.startsWith("/") && !n.startsWith("//") ? n : "/account"}`);
}
