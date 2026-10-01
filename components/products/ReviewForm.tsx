"use client";
import { useState } from "react";
export default function ReviewForm({ slug }: { slug: string }) {
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = e.currentTarget; const d = Object.fromEntries(new FormData(f));
    const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, slug }) }); const j = await r.json().catch(() => ({}));
    if (r.ok) { f.reset(); setM({ ok: true, t: "Thanks. Your review will appear once approved." }); } else setM({ ok: false, t: j.error ?? "Something went wrong." });
  }
  return (<form onSubmit={submit} className="mt-16 max-w-md space-y-4"><h2 className="font-serif text-3xl">Write a review</h2>
    <div><label htmlFor="rating" className="mb-1 block text-sm">Rating</label><select id="rating" name="rating" className="min-h-11 border border-sand bg-transparent px-2">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></div>
    <div><label htmlFor="body" className="mb-1 block text-sm">Your review</label><textarea id="body" name="body" rows={4} required className="w-full border border-sand bg-transparent p-3" /></div>
    <button className="btn-dark">Submit review</button><p role="status" className={`text-sm ${m?.ok ? "text-umber" : "text-red-800"}`}>{m?.t}</p></form>);
}
