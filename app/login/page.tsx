"use client";
import { useState } from "react";
import Page from "@/components/layout/Page";
import { supabaseBrowser } from "@/lib/supabase/client";
type Mode = "login" | "signup" | "forgot";
export default function Login() {
  const [mode, setMode] = useState<Mode>("login"); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const email = String(f.get("email")), password = String(f.get("password") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg({ ok: false, t: "Enter a valid email address." });
    if (mode !== "forgot" && password.length < 8) return setMsg({ ok: false, t: "Password must be at least 8 characters." });
    setBusy(true); setMsg(null);
    try {
      const sb = supabaseBrowser(); const redirect = `${location.origin}/auth/callback`;
      if (mode === "forgot") { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${redirect}?next=/account/reset` }); if (error) throw error; setMsg({ ok: true, t: "If that email has an account, a reset link is on its way." }); }
      else if (mode === "signup") { const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { full_name: String(f.get("name") ?? "") } } }); if (error) throw error; setMsg({ ok: true, t: "Check your email to confirm your account." }); }
      else { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; const n = new URLSearchParams(location.search).get("next"); location.href = n && n.startsWith("/") && !n.startsWith("//") ? n : "/account"; }
    } catch { setMsg({ ok: false, t: mode === "login" ? "Email or password is incorrect." : "Something went wrong. Please try again." }); } finally { setBusy(false); }
  }
  const input = "min-h-11 w-full border border-sand bg-transparent px-3";
  return (
    <Page title={mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}>
      <form onSubmit={submit} noValidate className="max-w-sm space-y-5">
        {mode === "signup" && <div><label htmlFor="name" className="mb-1 block text-sm">Full name</label><input id="name" name="name" autoComplete="name" className={input} /></div>}
        <div><label htmlFor="email" className="mb-1 block text-sm">Email</label><input id="email" name="email" type="email" autoComplete="email" className={input} /></div>
        {mode !== "forgot" && <div><label htmlFor="pw" className="mb-1 block text-sm">Password</label><input id="pw" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} className={input} /></div>}
        <button disabled={busy} className="btn-dark w-full">{busy ? "Please wait" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
        <p role="status" className={`text-sm ${msg?.ok ? "text-umber" : "text-red-800"}`}>{msg?.t}</p>
        <div className="flex gap-4 text-sm underline"><button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create an account" : "Back to sign in"}</button>{mode === "login" && <button type="button" onClick={() => setMode("forgot")}>Forgot password</button>}</div>
      </form>
    </Page>
  );
}
