import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { isEmail } from "@/lib/validate";
export async function POST(req) {
    if (!hasSupabase())
        return NextResponse.json({ error: "The contact form is not available yet." }, { status: 503 });
    const b = await req.json().catch(() => null);
    const name = String(b?.name ?? "").trim().slice(0, 120), email = String(b?.email ?? "").trim(), subject = String(b?.subject ?? "").trim().slice(0, 200), message = String(b?.message ?? "").trim().slice(0, 5000);
    if (!name || !isEmail(email) || message.length < 10)
        return NextResponse.json({ error: "Please complete all fields with a valid email and a longer message." }, { status: 400 });
    const { error } = await (await supabaseServer()).from("contact_messages").insert({ name, email, subject, message });
    if (error) {
        console.error("[contact] insert failed:", error.code, error.message);
        return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
