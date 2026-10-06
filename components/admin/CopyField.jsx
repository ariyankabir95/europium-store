"use client";
import { useState } from "react";
/** Read-only URL box with a Copy button (falls back to selecting the text when the clipboard API is unavailable). */
export default function CopyField({ value }) {
    const [done, setDone] = useState(false);
    return (<div className="mt-2 flex gap-1">
      <input readOnly value={value} aria-label="Image URL" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 border border-sand bg-transparent p-1"/>
      <button type="button" className="border border-sand px-2" onClick={async () => { try {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
    }
    catch { /* user can still select + copy */ } }}>{done ? "Copied" : "Copy"}</button>
    </div>);
}
