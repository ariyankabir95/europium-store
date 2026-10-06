"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
import SmartImage from "@/components/ui/SmartImage";
export default function CartDrawer() {
    const { open, setOpen, cart, products, remove, currency, signedIn, openAuth } = useStore();
    const close = useRef(null);
    const box = useRef(null);
    useEffect(() => { if (!open)
        return; close.current?.focus(); const k = (e) => { if (e.key === "Escape")
        return setOpen(false); if (e.key !== "Tab" || !box.current)
        return; const f = box.current.querySelectorAll("a[href],button:not([disabled])"); if (!f.length)
        return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    } }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [open, setOpen]);
    const lines = cart.map((l, i) => ({ ...l, i, p: products.find((x) => x.id === l.productId) })).filter((l) => l.p);
    const sub = lines.reduce((n, l) => n + (l.p.salePrice ?? l.p.price) * l.qty, 0);
    return (<>
    <div onClick={() => setOpen(false)} aria-hidden="true" className={`fixed inset-0 z-[70] bg-charcoal/40 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}/>
    <aside ref={box} role="dialog" aria-modal="true" aria-label="Cart" className={`fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col bg-warm shadow-xl transition-transform duration-300 ${open ? "translate-x-0" : "invisible translate-x-full"}`}>
      <div className="flex items-center justify-between border-b border-sand p-5"><h2 className="font-serif text-2xl">Your cart</h2><button ref={close} onClick={() => setOpen(false)} className="min-h-11 px-2 text-sm underline">Close</button></div>
      {!signedIn ? <div className="flex-1 px-5 py-8 text-sm text-umber"><p>Sign in or create an account to use your cart.</p><button onClick={() => { setOpen(false); openAuth("Sign in or create an account to view your cart."); }} className="btn-dark mt-6">Sign in / Create account</button></div> : <ul className="flex-1 divide-y divide-sand overflow-y-auto px-5 text-sm">{lines.length ? lines.map((l) => <li key={`${l.productId}${l.size}${l.color}`} className="flex justify-between gap-3 py-4"><span className="relative block h-20 w-16 shrink-0 overflow-hidden bg-cream"><SmartImage src={l.p.images[0]} alt="" sizes="64px"/></span><span className="flex-1">{l.p.name}<br /><span className="text-taupe">{l.size} / {l.color} × {l.qty}</span></span><span className="text-right">{money((l.p.salePrice ?? l.p.price) * l.qty, currency)}<br /><button onClick={() => remove(l.i)} className="min-h-11 text-taupe underline">Remove</button></span></li>) : <li className="py-8 text-umber">Your cart is empty.</li>}</ul>}
      {signedIn && <div className="space-y-3 border-t border-sand p-5"><p className="flex justify-between text-sm"><span>Subtotal</span><span>{money(sub, currency)}</span></p><Link href="/cart" onClick={() => setOpen(false)} className="btn-line w-full">View cart</Link><Link href="/checkout" onClick={() => setOpen(false)} className="btn-dark w-full">Checkout</Link></div>}
    </aside></>);
}
