"use client";
import { useState } from "react";
export default function PostForm({ url, fields, submit, success, inline = false }) {
    const [state, setState] = useState({ busy: false });
    async function onSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        setState({ busy: true });
        try {
            const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
            const j = await r.json().catch(() => ({}));
            if (r.ok) {
                form.reset();
                setState({ busy: false, ok: true, t: success });
            }
            else
                setState({ busy: false, ok: false, t: j.error ?? "Something went wrong." });
        }
        catch {
            setState({ busy: false, ok: false, t: "Network error. Please try again." });
        }
    }
    const input = "min-h-11 w-full border border-sand bg-transparent px-3 py-2";
    return (<form onSubmit={onSubmit} className={inline ? "flex flex-col gap-3 sm:flex-row" : "max-w-xl space-y-5"}>
      {fields.map((f) => <div key={f.name} className={inline ? "flex-1" : ""}><label htmlFor={f.name} className={inline ? "sr-only" : "mb-1 block text-sm"}>{f.label}</label>{f.area ? <textarea id={f.name} name={f.name} rows={5} required className={input}/> : <input id={f.name} name={f.name} type={f.type ?? "text"} required placeholder={inline ? f.label : undefined} className={input}/>}</div>)}
      <button disabled={state.busy} className="btn-dark">{state.busy ? "Sending" : submit}</button>
      <p role="status" className={`text-sm sm:basis-full ${state.ok === false ? "text-red-800" : ""}`}>{state.t}</p>
    </form>);
}
