"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useHeaderNav } from "@/components/layout/NavContext";
import { CURRENCIES, CURRENCY_META, isCurrency } from "@/lib/format";
const icons = [["Search", "/search"], ["Wishlist", "/wishlist"], ["Account", "/account"], ["Cart", "/cart"]];
function NavAnchor({ n, className, onClick }) {
    const external = /^(https?:|mailto:|tel:)/i.test(n.href);
    if (external || n.newTab)
        return <a href={n.href} onClick={onClick} className={className} {...(n.newTab || /^https?:/i.test(n.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{n.label}</a>;
    return <Link href={n.href} onClick={onClick} className={className}>{n.label}</Link>;
}
function DesktopNavItem({ n, depth = 0 }) {
    const children = Array.isArray(n.children) ? n.children : [];
    if (!children.length) {
        return <NavAnchor n={n} className={depth === 0 ? "underline-offset-8 hover:underline" : "block whitespace-nowrap px-4 py-3 hover:bg-cream"}/>;
    }
    return (
      <div className="group relative">
        <div className={`flex items-center gap-2 ${depth === 0 ? "" : "justify-between px-4 py-3 hover:bg-cream"}`}>
          <NavAnchor n={n} className={depth === 0 ? "underline-offset-8 hover:underline" : "flex-1 whitespace-nowrap"}/>
          <span aria-hidden="true" className="text-[10px]">{depth === 0 ? "⌄" : "›"}</span>
        </div>
        <div className={`absolute z-50 hidden min-w-48 border border-sand bg-warm py-1 text-charcoal shadow-lg group-hover:block group-focus-within:block ${depth === 0 ? "left-0 top-full" : "left-full top-0"}`}>
          {children.map((child) => <DesktopNavItem key={child.id} n={child} depth={depth + 1}/>)}
        </div>
      </div>
    );
}
function MobileNavItem({ n, onClick, depth = 0 }) {
    const className = depth === 0
        ? "py-4 font-serif text-3xl"
        : depth === 1
            ? "py-3 pl-6 text-xl"
            : depth === 2
                ? "py-2 pl-10 text-lg"
                : "py-2 pl-12 text-base";
    return (
      <>
        <NavAnchor n={n} onClick={onClick} className={className}/>
        {(n.children ?? []).map((child) => <MobileNavItem key={child.id} n={child} onClick={onClick} depth={depth + 1}/>)}
      </>
    );
}
/*
 * Themed currency selector. The native <select> is kept (so the OS picker still works on mobile and the BDT/USD
 * switching is untouched), but its browser chrome is reset (appearance-none) and every state is styled from the
 * Europium theme colors instead of the browser default or the global black focus outline.
 * "overlay" = header sitting transparently over the hero, "solid" = normal header, "panel" = mobile menu.
 */
const selectTones = {
    solid: "border-sand bg-warm text-charcoal hover:border-taupe focus:border-umber focus-visible:ring-umber/30 active:border-umber",
    overlay: "border-warm/40 bg-transparent text-warm hover:border-warm/80 focus:border-warm focus-visible:ring-warm/40 active:border-warm",
    panel: "border-sand bg-cream text-charcoal hover:border-taupe focus:border-umber focus-visible:ring-umber/30 active:border-umber",
};
function CurrencySelect({ currency, onChange, tone, className = "" }) {
    return (<span className={`relative inline-flex items-center ${className}`}>
      <select aria-label="Currency" value={currency} onChange={(e) => { const v = e.target.value; if (isCurrency(v))
        onChange(v); }} className={`min-h-9 cursor-pointer appearance-none rounded-none border py-0 pl-3 pr-8 text-xs uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 [&>option]:bg-warm [&>option]:text-charcoal ${selectTones[tone]}`}>
        {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_META[c].label}</option>)}
      </select>
      <svg aria-hidden="true" viewBox="0 0 10 6" className="pointer-events-none absolute right-3 h-1.5 w-2.5 fill-none stroke-current" strokeWidth="1.5"><path d="M1 1l4 4 4-4"/></svg>
    </span>);
}
export default function Header({ overlay = false, bar }) {
    const { items, logoText } = useHeaderNav();
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const { count, wish, currency, setCurrency } = useStore();
    useEffect(() => { const f = () => setScrolled(window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
    useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; if (!open)
        return; const k = (e) => e.key === "Escape" && setOpen(false); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [open]);
    const solid = !overlay || scrolled;
    return (<header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid ? "border-b border-sand bg-warm text-charcoal" : "bg-transparent text-warm"}`}>
      {bar && <p className="bg-charcoal py-2 text-center text-xs tracking-[0.12em] text-warm">{bar}</p>}
      <div className="container-site flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="font-display text-2xl tracking-[0.25em]">{logoText}</Link>
        <nav aria-label="Primary" className="hidden gap-8 text-xs tracking-[0.18em] uppercase lg:flex">
          {items.map((n) => <DesktopNavItem key={n.id} n={n}/>)}
        </nav>
        <div className="flex items-center gap-1 text-xs tracking-[0.12em] uppercase">
          {icons.map(([l, h]) => <Link key={l} href={h} className={`min-h-11 items-center px-2 ${l === "Search" || l === "Cart" ? "flex" : "hidden lg:flex"}`}>{l}{l === "Cart" && count > 0 ? ` (${count})` : ""}{l === "Wishlist" && wish.length > 0 ? ` (${wish.length})` : ""}</Link>)}
          <CurrencySelect currency={currency} onChange={setCurrency} tone={solid ? "solid" : "overlay"} className="ml-1 hidden lg:inline-flex"/>
          <button className="min-h-11 px-2 lg:hidden" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>Menu</button>
        </div>
      </div>
      <div id="drawer" className={`fixed inset-0 z-50 bg-warm text-charcoal transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "invisible translate-x-full"}`} aria-hidden={!open}>
        <div className="container-site flex h-16 items-center justify-between"><span className="font-display text-2xl tracking-[0.25em]">{logoText}</span><button className="min-h-11 px-2 text-xs uppercase tracking-[0.12em]" onClick={() => setOpen(false)}>Close</button></div>
        <nav aria-label="Mobile" className="container-site flex flex-col divide-y divide-sand">
          {items.map((n) => <MobileNavItem key={n.id} n={n} onClick={() => setOpen(false)}/>)}
          {[["Wishlist", "/wishlist"], ["Account", "/account"]].map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="py-4 font-serif text-3xl">{l}</Link>)}
          <div className="flex items-center justify-between py-4"><span className="text-xs uppercase tracking-[0.18em] text-umber">Currency</span><CurrencySelect currency={currency} onChange={setCurrency} tone="panel" className="[&>select]:min-h-11"/></div>
        </nav>
      </div>
    </header>);
}
