"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SmartImage from "@/components/ui/SmartImage";
import Placeholder from "@/components/ui/Placeholder";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";

export default function SearchOverlay({ open, onClose = () => {}, inline = false }) {
  const { currency } = useStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || inline) {
      setQ("");
      setResults([]);
      setCategories([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    if (inline) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open, inline]);

  useEffect(() => {
    if (!open || inline) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const onOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("touchstart", onOutsideClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("touchstart", onOutsideClick);
    };
  }, [open, onClose, inline]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setCategories([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { results: [], categories: [], total: 0 })
        .then((data) => {
          setResults(data.results ?? []);
          setCategories(data.categories ?? []);
          setTotal(data.total ?? 0);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setResults([]);
            setCategories([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, q]);

  if (!open && !inline) return null;
  const term = q.trim();

  if (inline) {
    return (
      <div ref={panelRef} className="relative w-full text-charcoal">
        <form action="/search" method="get" role="search" className="group flex h-11 items-center gap-2 rounded-full border border-charcoal/20 bg-transparent px-4 transition-all duration-200 hover:border-charcoal/40 focus-within:border-charcoal/60 focus-within:shadow-[0_0_0_3px_rgba(38,36,33,0.04)]">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 flex-none stroke-current text-taupe transition-colors group-focus-within:text-charcoal" fill="none" strokeWidth="1.5"><circle cx="8.5" cy="8.5" r="5.8"/><path d="m13 13 4 4" strokeLinecap="round"/></svg>
          <input ref={inputRef} name="q" value={q} onChange={(event) => setQ(event.target.value)} type="search" placeholder="Search products..." aria-label="Search products" autoComplete="off" className="min-w-0 w-full bg-transparent text-[13px] tracking-wide placeholder:text-taupe/80 focus:outline-none" />
          {term && <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label="Clear search" className="text-[10px] uppercase tracking-wider text-taupe transition-colors hover:text-charcoal">Clear</button>}
          <button type="submit" aria-label="Search" title="Search" className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-taupe transition-all hover:bg-charcoal hover:text-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/30">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.5"><circle cx="8.5" cy="8.5" r="5.8"/><path d="m13 13 4 4" strokeLinecap="round"/></svg>
          </button>
        </form>
        {term.length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-sand/80 bg-warm/95 p-3 text-charcoal shadow-[0_18px_45px_rgba(38,36,33,0.14)] backdrop-blur-xl">
            {loading ? <p className="px-2 py-4 text-sm text-taupe">Searching products...</p> : (categories.length > 0 || results.length > 0) ? (
              <>
                {categories.length > 0 && <div className="mb-3 border-b border-sand pb-3"><p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-taupe">Categories</p><div className="flex flex-wrap gap-2">{categories.map((category) => <Link key={category.slug} href={"/category/" + category.slug} className="border border-sand px-2.5 py-2 text-xs hover:border-charcoal hover:bg-cream">{category.name} ↗</Link>)}</div></div>}
                {results.length > 0 && <><div className="mb-2 flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.18em] text-taupe">Products</p><span className="text-[10px] text-taupe">{total} found</span></div><ul className="space-y-1">{results.slice(0, 5).map((product) => <li key={product.slug}><Link href={"/product/" + product.slug} className="flex items-center gap-3 p-2 transition-colors hover:bg-cream"><div className="relative h-14 w-12 flex-none overflow-hidden bg-cream"><SmartImage src={product.image} alt={product.name} sizes="48px" fallback={<Placeholder label={product.name} tone="cream"/>}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs">{product.name}</p><p className="mt-1 text-xs text-umber">{money(product.salePrice || product.price, currency)}{product.salePrice ? <span className="ml-2 text-taupe line-through">{money(product.price, currency)}</span> : null}</p></div><span aria-hidden="true" className="text-taupe">↗</span></Link></li>)}</ul></>}
              </>
            ) : <p className="px-2 py-4 text-sm text-taupe">No matches for “{term}”. Try another product or category.</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-16 z-50 md:top-20" role="dialog" aria-label="Store search">
      <div
        ref={panelRef}
        role="search"
        className="max-h-[calc(100vh-4rem)] overflow-y-auto border-y border-sand bg-warm text-charcoal shadow-[0_24px_55px_rgba(38,36,33,0.16)]"
      >
        <div className="container-site py-5 md:py-7">
          <div className="flex items-center gap-3 border-b border-charcoal/20 pb-3 md:gap-4">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 flex-none stroke-current text-umber" fill="none" strokeWidth="1.5">
              <circle cx="9" cy="9" r="6.5" />
              <path d="M18 18l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              type="search"
              placeholder="Search products, categories, materials…"
              aria-label="Search products, categories and materials"
              autoComplete="off"
              className="min-h-12 w-full border-0 bg-transparent font-serif text-xl placeholder:text-taupe/80 focus:outline-none md:text-2xl"
            />
            {term && (
              <button onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label="Clear search" className="flex h-10 w-10 flex-none items-center justify-center text-xs uppercase tracking-[0.12em] text-taupe hover:text-charcoal">
                Clear
              </button>
            )}
            <button onClick={onClose} aria-label="Close search" className="flex h-10 w-10 flex-none items-center justify-center text-taupe transition-colors hover:text-charcoal">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.5">
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {term.length < 2 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-xs uppercase tracking-[0.14em] text-taupe">
              <span className="text-charcoal/60">Explore</span>
              <Link href="/category/clothing" onClick={onClose} className="hover:text-charcoal">Clothing</Link>
              <Link href="/shop?sort=newest" onClick={onClose} className="hover:text-charcoal">New arrivals</Link>
              <Link href="/shop" onClick={onClose} className="hover:text-charcoal">All products</Link>
            </div>
          ) : loading ? (
            <p className="py-7 text-sm text-taupe">Finding the right pieces…</p>
          ) : (
            <div className="pt-5 md:pt-6">
              {categories.length > 0 && (
                <section className="mb-6">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-taupe">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/category/${category.slug}`}
                        onClick={onClose}
                        className="group inline-flex min-h-11 items-center gap-3 border border-sand bg-cream/60 px-4 py-2 text-sm transition-colors hover:border-charcoal hover:bg-charcoal hover:text-warm"
                      >
                        <span>{category.name}</span>
                        <span aria-hidden="true" className="text-taupe transition-transform group-hover:translate-x-0.5 group-hover:text-warm">↗</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {results.length > 0 ? (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-taupe">Matching pieces</p>
                    <p className="text-xs text-taupe">{total} {total === 1 ? "result" : "results"}</p>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {results.map((product) => (
                      <li key={product.slug}>
                        <Link href={`/product/${product.slug}`} onClick={onClose} className="group block">
                          <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                            <SmartImage src={product.image} alt={product.name} sizes="(min-width: 768px) 200px, 45vw" fallback={<Placeholder label={product.name} tone="cream" />} />
                          </div>
                          <p className="mt-3 truncate text-sm transition-colors group-hover:text-umber">{product.name}</p>
                          <p className="mt-1 flex gap-2 text-xs text-taupe">
                            {product.salePrice ? (
                              <>
                                <span className="text-charcoal">{money(product.salePrice, currency)}</span>
                                <span className="line-through">{money(product.price, currency)}</span>
                              </>
                            ) : <span>{money(product.price, currency)}</span>}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {categories.length === 0 && results.length === 0 && (
                <div className="mt-4 border-t border-sand pt-4 text-sm text-umber">
                  No exact matches for “{term}”. Try a product name, category or material.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
