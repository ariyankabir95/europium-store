"use client";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/products/ProductCard";
import { useStore } from "@/lib/store";
const sorts = [["featured", "Featured"], ["newest", "Newest"], ["low", "Price: Low to High"], ["high", "Price: High to Low"], ["best", "Best Selling"]] as const;
const eff = (p: Product) => p.salePrice ?? p.price;
const toggle = (set: Set<string>, v: string) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n; };
export default function Catalog({ products, initialQuery = "", searchable = true }: { products: Product[]; initialQuery?: string; searchable?: boolean }) {
  const { add } = useStore();
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState("featured");
  const [sizes, setSizes] = useState(new Set<string>());
  const [colors, setColors] = useState(new Set<string>());
  const [max, setMax] = useState(500);
  const [open, setOpen] = useState(false);
  const allSizes = useMemo(() => [...new Set(products.flatMap((p) => p.sizes))], [products]);
  const allColors = useMemo(() => [...new Set(products.flatMap((p) => p.colors.map((c) => c.name)))], [products]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = products.filter((p) => (!t || [p.name, p.category, p.description, ...p.tags].join(" ").toLowerCase().includes(t)) && eff(p) <= max && (!sizes.size || p.sizes.some((s) => sizes.has(s))) && (!colors.size || p.colors.some((c) => colors.has(c.name))));
    const by: Record<string, (a: Product, b: Product) => number> = { newest: (a, b) => b.createdAt.localeCompare(a.createdAt), low: (a, b) => eff(a) - eff(b), high: (a, b) => eff(b) - eff(a), best: (a, b) => b.sold - a.sold };
    return by[sort] ? [...r].sort(by[sort]) : r;
  }, [products, q, sort, sizes, colors, max]);
  const chip = (on: boolean) => `min-h-11 min-w-11 border px-3 text-sm ${on ? "border-charcoal bg-charcoal text-warm" : "border-sand"}`;
  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr] md:gap-12">
      <aside aria-label="Filters">
        <button className="btn-line w-full md:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>Filters</button>
        <div className={`${open ? "mt-6 block" : "hidden"} space-y-8 md:block`}>
          {searchable && <div><label htmlFor="q" className="mb-2 block text-xs tracking-[0.18em] uppercase">Search</label><input id="q" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 w-full border border-sand bg-transparent px-3" /></div>}
          <fieldset><legend className="mb-2 text-xs tracking-[0.18em] uppercase">Size</legend><div className="flex flex-wrap gap-2">{allSizes.map((s) => <button key={s} aria-pressed={sizes.has(s)} onClick={() => setSizes(toggle(sizes, s))} className={chip(sizes.has(s))}>{s}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 text-xs tracking-[0.18em] uppercase">Color</legend><div className="flex flex-wrap gap-2">{allColors.map((s) => <button key={s} aria-pressed={colors.has(s)} onClick={() => setColors(toggle(colors, s))} className={chip(colors.has(s))}>{s}</button>)}</div></fieldset>
          <div><label htmlFor="mx" className="mb-2 block text-xs tracking-[0.18em] uppercase">Max price: ${max}</label><input id="mx" type="range" min={50} max={500} step={10} value={max} onChange={(e) => setMax(+e.target.value)} className="w-full" /></div>
        </div>
      </aside>
      <div>
        <div className="mb-6 flex items-center justify-between border-b border-sand pb-4 text-sm"><p aria-live="polite">{list.length} {list.length === 1 ? "product" : "products"}</p>
          <label className="flex items-center gap-2">Sort<select value={sort} onChange={(e) => setSort(e.target.value)} className="min-h-11 border border-sand bg-transparent px-2">{sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></div>
        {list.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 lg:gap-x-5">{list.map((p) => <ProductCard key={p.id} product={p} onQuickAdd={(x) => add({ productId: x.id, size: x.sizes[0] ?? "", color: x.colors[0]?.name ?? "", qty: 1 })} />)}</div> : <p className="py-16 text-center text-umber">No products match these filters. Clear a filter or try a different search.</p>}
      </div>
    </div>
  );
}
