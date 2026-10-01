"use client";
import { useState } from "react";
import Page from "@/components/layout/Page";
import { supabaseBrowser } from "@/lib/supabase/client";
export default function Reset() {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const pw = String(new FormData(e.currentTarget).get("password"));
    if (pw.length < 8) return setMsg({ ok: false, t: "Password must be at least 8 characters." });
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw }); setMsg(error ? { ok: false, t: "Could not update the password. Request a new reset link." } : { ok: true, t: "Password updated." });
  }
  return (<Page title="Choose a new password"><form onSubmit={submit} className="max-w-sm space-y-5"><div><label htmlFor="pw" className="mb-1 block text-sm">New password</label><input id="pw" name="password" type="password" autoComplete="new-password" className="min-h-11 w-full border border-sand bg-transparent px-3" /></div><button className="btn-dark">Update password</button><p role="status" className={`text-sm ${msg?.ok ? "text-umber" : "text-red-800"}`}>{msg?.t}</p></form></Page>);
}
