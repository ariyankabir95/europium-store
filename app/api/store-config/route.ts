import { NextResponse } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/cms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ bkash_number: DEFAULT_SETTINGS.bkash_number, bkash_instructions: DEFAULT_SETTINGS.bkash_instructions });
  const { data } = await supabaseAdmin().from("site_settings").select("value").eq("key", "general").maybeSingle();
  const v = (data?.value ?? {}) as Record<string, unknown>;
  return NextResponse.json({ bkash_number: String(v.bkash_number ?? "").trim(), bkash_instructions: String(v.bkash_instructions ?? DEFAULT_SETTINGS.bkash_instructions).trim() });
}
