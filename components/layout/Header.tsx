"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
export const nav = [["Home", "/"], ["Shop", "/shop"], ["Clothing", "/category/clothing"], ["Footwear", "/category/footwear"], ["Accessories", "/category/accessories"], ["Lookbook", "/lookbook"], ["Sale", "/sale"]] as const;
const icons = [["Search", "/search"], ["Wishlist", "/wishlist"], ["Account", "/account"], ["Cart", "/cart"]] as const;

export default function Header({ overlay = false, bar }: { overlay?: boolean; bar?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count, wish } = useStore();
  useEffect(() => { const f = () => setScrolled(window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [open]);
  const solid = !overlay || scrolled;
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid ? "border-b border-sand bg-warm text-charcoal" : "bg-transparent text-warm"}`}>
      {bar && <p className="bg-charcoal py-2 text-center text-xs tracking-[0.12em] text-warm">{bar}</p>}
      <div className="container-site flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="font-display text-2xl tracking-[0.25em]">EUROPIUM</Link>
        <nav aria-label="Primary" className="hidden gap-8 text-xs tracking-[0.18em] uppercase lg:flex">
          {nav.map(([l, h]) => <Link key={l} href={h} className="underline-offset-8 hover:underline">{l}</Link>)}
        </nav>
        <div className="flex items-center gap-1 text-xs tracking-[0.12em] uppercase">
          {icons.map(([l, h]) => <Link key={l} href={h} className={`min-h-11 items-center px-2 ${l === "Search" || l === "Cart" ? "flex" : "hidden lg:flex"}`}>{l}{l === "Cart" && count > 0 ? ` (${count})` : ""}{l === "Wishlist" && wish.length > 0 ? ` (${wish.length})` : ""}</Link>)}
          <button className="min-h-11 px-2 lg:hidden" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>Menu</button>
        </div>
      </div>
      <div id="drawer" className={`fixed inset-0 z-50 bg-warm text-charcoal transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "invisible translate-x-full"}`} aria-hidden={!open}>
        <div className="container-site flex h-16 items-center justify-between"><span className="font-display text-2xl tracking-[0.25em]">EUROPIUM</span><button className="min-h-11 px-2 text-xs uppercase tracking-[0.12em]" onClick={() => setOpen(false)}>Close</button></div>
        <nav aria-label="Mobile" className="container-site flex flex-col divide-y divide-sand">
          {[...nav, ["Wishlist", "/wishlist"], ["Account", "/account"]].map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="py-4 font-serif text-3xl">{l}</Link>)}
        </nav>
      </div>
    </header>
  );
}
