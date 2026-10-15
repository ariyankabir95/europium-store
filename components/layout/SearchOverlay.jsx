"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SmartImage from "@/components/ui/SmartImage";
import Placeholder from "@/components/ui/Placeholder";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";

/*
 * Inline search: opens as a panel right under the header instead of navigating to a page. Typing shows
 * matching products right here (debounced call to /api/search); nothing to open separately. "View all N
 * results" still links to /search?q=... for the full filterable grid, but that's optional, not required.
 */
export default function SearchOverlay({ open, onClose }) {
  const { currency } = useStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setQ("");
    setResults([]);
    setTotal(0);
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : { results: [], total: 0 }))
        .then((d) => {
          setResults(d.results ?? []);
          setTotal(d.total ?? 0);
        })
        .catch(() => {
          setResults([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (!open) return null;
  const term = q.trim();

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-[1px]" role="presentation">
      <div
        ref={panelRef}
        role="search"
        className="mt-16 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-sand bg-warm shadow-xl md:mt-20"
      >
        <div className="container-site py-6">
          <div className="flex items-center gap-3 border-b border-sand pb-4">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 flex-none stroke-current" fill="none" strokeWidth="1.5">
              <circle cx="9" cy="9" r="6.5" />
              <path d="M18 18l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Search products"
              aria-label="Search products"
              className="min-h-11 w-full border-0 bg-transparent font-serif text-xl placeholder:text-taupe focus:outline-none md:text-2xl"
            />
            <button
              onClick={onClose}
              aria-label="Close search"
              className="flex h-11 w-11 flex-none items-center justify-center text-taupe transition-colors duration-200 hover:text-charcoal"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.5">
                <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {term.length >= 2 && (
            <div className="pt-6">
              {loading ? (
                <p className="py-6 text-sm text-taupe">Searching…</p>
              ) : results.length ? (
                <>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {results.map((p) => (
                      <li key={p.slug}>
                        <Link href={`/product/${p.slug}`} onClick={onClose} className="group block">
                          <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                            <SmartImage src={p.image} alt={p.name} sizes="(min-width: 768px) 200px, 45vw" fallback={<Placeholder label={p.name} tone="cream" />} />
                          </div>
                          <p className="mt-2 truncate text-sm group-hover:underline">{p.name}</p>
                          <p className="flex gap-2 text-xs text-taupe">
                            {p.salePrice ? (
                              <>
                                <span className="text-charcoal">{money(p.salePrice, currency)}</span>
                                <span className="line-through">{money(p.price, currency)}</span>
                              </>
                            ) : (
                              <span>{money(p.price, currency)}</span>
                            )}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {total > results.length && (
                    <Link
                      href={`/search?q=${encodeURIComponent(term)}`}
                      onClick={onClose}
                      className="mt-8 inline-block text-xs uppercase tracking-[0.18em] underline underline-offset-4 hover:text-umber"
                    >
                      View all {total} results for &ldquo;{term}&rdquo;
                    </Link>
                  )}
                </>
              ) : (
                <p className="py-6 text-sm text-umber">No products match &ldquo;{term}&rdquo;.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
