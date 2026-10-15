"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useHeaderNav } from "@/components/layout/NavContext";
import { CURRENCIES, CURRENCY_META, isCurrency } from "@/lib/format";
import SearchOverlay from "@/components/layout/SearchOverlay";
const icons = [["Wishlist", "/wishlist"], ["Account", "/account"], ["Cart", "/cart"]];
/** Animated 3-line -> X menu icon, replacing the old plain "Menu" text label (mobile only). */
function MenuIcon({ open }) {
    return (<span aria-hidden="true" className="relative flex h-4 w-5 flex-col justify-between">
      <span className={`block h-px w-full bg-current transition-transform duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`}/>
      <span className={`block h-px w-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`}/>
      <span className={`block h-px w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`}/>
    </span>);
}
function CloseIcon() {
    return (<svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.5"><path d="M4 4l12 12M16 4L4 16" strokeLinecap="round"/></svg>);
}
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
      <div className="group/navitem relative">
        <div className={`flex items-center gap-2 ${depth === 0 ? "" : "justify-between px-4 py-3 hover:bg-cream"}`}>
          <NavAnchor n={n} className={depth === 0 ? "underline-offset-8 hover:underline" : "flex-1 whitespace-nowrap"}/>
          <span aria-hidden="true" className="text-[10px]">{depth === 0 ? "⌄" : "›"}</span>
        </div>
        <div className={`invisible absolute z-50 min-w-52 translate-y-1 rounded-sm border border-sand bg-warm py-2 text-charcoal opacity-0 shadow-[0_18px_45px_rgba(38,36,33,0.14)] transition-all duration-200 ease-out group-hover/navitem:visible group-hover/navitem:translate-y-0 group-hover/navitem:opacity-100 group-focus-within/navitem:visible group-focus-within/navitem:translate-y-0 group-focus-within/navitem:opacity-100 ${depth === 0 ? "left-0 top-full" : "left-full top-0"}`}>
          {children.map((child) => <DesktopNavItem key={child.id} n={child} depth={depth + 1}/>)}
        </div>
      </div>
    );
}
function MobileNavItem({ n, onClick, depth = 0 }) {
    const [expanded, setExpanded] = useState(false);
    const children = Array.isArray(n.children) ? n.children : [];
    const base = "block min-w-0 transition-colors duration-200 hover:text-umber";
    const className = depth === 0
        ? `${base} py-4 font-serif text-2xl sm:text-3xl`
        : depth === 1
            ? `${base} py-3 text-base text-charcoal sm:text-lg`
            : `${base} py-2 text-sm text-umber sm:text-base`;

    if (!children.length) {
        return <NavAnchor n={n} onClick={onClick} className={className}/>;
    }

    return (
      <div className="py-1">
        <div className="flex items-center gap-3">
          <NavAnchor n={n} onClick={onClick} className={`${className} flex-1`}/>
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${n.label} submenu`}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="flex h-11 w-11 flex-none items-center justify-center border border-sand text-umber transition-colors hover:border-charcoal hover:bg-cream hover:text-charcoal"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className={`h-3.5 w-3.5 fill-none stroke-current transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} strokeWidth="1.5">
              <path d="m3 6 5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {expanded && (
          <div className="mb-3 ml-1 mt-2 space-y-1 border-l-2 border-sand pl-4 sm:pl-5">
            {children.map((child) => <MobileNavItem key={child.id} n={child} onClick={onClick} depth={depth + 1}/>)}
          </div>
        )}
      </div>
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
    const [searchOpen, setSearchOpen] = useState(false);
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
          {/* Compact search trigger on smaller screens; wide screens get the persistent Believers-style field. */}
          <button onClick={() => { setOpen(false); setSearchOpen(true); }} aria-haspopup="dialog" aria-expanded={searchOpen} aria-label="Open search" className="flex min-h-11 items-center gap-2 px-2 transition-colors hover:text-umber xl:hidden">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 flex-none stroke-current" fill="none" strokeWidth="1.5"><circle cx="8.5" cy="8.5" r="5.8"/><path d="m13 13 4 4" strokeLinecap="round"/></svg>
            <span className="hidden sm:inline">Search</span>
          </button>
          <div className="hidden w-56 xl:block 2xl:w-64">
            <SearchOverlay open inline />
          </div>
          {icons.map(([l, h]) => <Link key={l} href={h} className={`min-h-11 items-center px-2 ${l === "Cart" ? "flex" : "hidden lg:flex"}`}>{l}{l === "Cart" && count > 0 ? ` (${count})` : ""}{l === "Wishlist" && wish.length > 0 ? ` (${wish.length})` : ""}</Link>)}
          <CurrencySelect currency={currency} onChange={setCurrency} tone={solid ? "solid" : "overlay"} className="ml-1 hidden lg:inline-flex"/>
          <button className="flex min-h-11 min-w-11 items-center justify-center px-2 lg:hidden" aria-expanded={open} aria-controls="drawer" aria-label={open ? "Close menu" : "Open menu"} onClick={() => { setSearchOpen(false); setOpen(!open); }}>
            <MenuIcon open={open}/>
          </button>
        </div>
      </div>
      <div id="drawer" className={`fixed inset-0 z-50 flex flex-col bg-warm text-charcoal transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "invisible translate-x-full"}`} aria-hidden={!open}>
        <div className="container-site flex h-16 flex-none items-center justify-between border-b border-sand">
          <span className="font-display text-2xl tracking-[0.25em]">{logoText}</span>
          <button className="flex h-11 w-11 items-center justify-center text-taupe transition-colors duration-200 hover:text-charcoal" aria-label="Close menu" onClick={() => setOpen(false)}><CloseIcon/></button>
        </div>
        <nav aria-label="Mobile" className="container-site flex-1 overflow-y-auto pb-10">
          <div className="flex flex-col divide-y divide-sand">
            {items.map((n, i) => (<div key={n.id} className={`transition-all duration-300 ease-out ${open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"}`} style={{ transitionDelay: open ? `${60 + i * 45}ms` : "0ms" }}>
              <MobileNavItem n={n} onClick={() => setOpen(false)}/>
            </div>))}
          </div>
          <div className={`mt-8 border-t border-sand pt-6 transition-all duration-300 ease-out ${open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"}`} style={{ transitionDelay: open ? `${60 + items.length * 45}ms` : "0ms" }}>
            <div className="flex gap-6 text-xs uppercase tracking-[0.18em] text-umber">
              {[["Wishlist", "/wishlist"], ["Account", "/account"]].map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="transition-colors duration-200 hover:text-charcoal">{l}</Link>)}
            </div>
            <div className="mt-5 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.18em] text-umber">Currency</span><CurrencySelect currency={currency} onChange={setCurrency} tone="panel" className="[&>select]:min-h-11"/></div>
          </div>
        </nav>
      </div>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)}/>
    </header>);
}
