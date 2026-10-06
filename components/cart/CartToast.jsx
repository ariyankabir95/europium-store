"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
/** Small status message for cart actions that could not finish (for example an out-of-stock item). */
export default function CartToast() {
    const { notice, clearNotice } = useStore();
    useEffect(() => { if (!notice)
        return; const t = setTimeout(clearNotice, 6000); return () => clearTimeout(t); }, [notice, clearNotice]);
    if (!notice)
        return null;
    return (<div role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-[95] mx-auto flex max-w-md items-center justify-between gap-4 border border-sand bg-warm p-4 text-sm text-charcoal shadow-xl">
      <span>{notice}</span>
      <button type="button" onClick={clearNotice} className="min-h-11 px-2 underline">Dismiss</button>
    </div>);
}
