"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { firstAvailableVariant } from "@/lib/variant";
import { money, discount } from "@/lib/format";
import Placeholder from "@/components/ui/Placeholder";
import SmartImage from "@/components/ui/SmartImage";
export default function ProductCard({ product: p, onQuickAdd }) {
    const { wish: w, toggleWish, currency, add, notify } = useStore();
    // One shared Add to cart for every product grid (home, shop, category, collection, search, wishlist, related...).
    // The store decides: signed in -> added to the server cart; signed out -> sign-in popup that remembers this exact variant.
    const quickAdd = () => {
        if (onQuickAdd)
            return onQuickAdd(p);
        const v = firstAvailableVariant(p);
        if (!v)
            return notify("That item is currently out of stock.");
        void add({ productId: p.id, size: v.size, color: v.color, qty: 1 }).then((r) => { if (r.status === "error")
            notify(r.message); });
    };
    const wish = w.includes(p.id);
    const off = discount(p.price, p.salePrice);
    return (<article className="group">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        <Link href={`/product/${p.slug}`} aria-label={p.name} className="block h-full">
          <div className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0"><SmartImage src={p.images[0]} alt={p.name} sizes="(min-width: 1024px) 33vw, 50vw" fallback={<Placeholder label={p.name}/>}/></div>
          <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">{p.images[1] ? <SmartImage src={p.images[1]} alt="" sizes="(min-width: 1024px) 33vw, 50vw"/> : p.images[0] ? null : <Placeholder label={`${p.name} – alternate`} tone="cream"/>}</div>
        </Link>
        {p.badge && <span className="absolute left-3 top-3 bg-warm px-2 py-1 text-[10px] tracking-[0.15em]">{p.badge}</span>}
        <button onClick={() => toggleWish(p.id)} aria-pressed={wish} aria-label={wish ? "Remove from wishlist" : "Add to wishlist"} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center bg-warm/90 text-sm">{wish ? "♥" : "♡"}</button>
        <button onClick={quickAdd} className="absolute inset-x-0 bottom-0 min-h-12 translate-y-full bg-charcoal text-xs tracking-[0.18em] text-warm uppercase transition-transform duration-300 focus-visible:translate-y-0 group-hover:translate-y-0 max-md:translate-y-0">Add to cart</button>
      </div>
      <div className="mt-4 space-y-1 text-sm">
        <h3><Link href={`/product/${p.slug}`} className="hover:underline">{p.name}</Link></h3>
        <p className="flex gap-2">{p.salePrice ? (<><span>{money(p.salePrice, currency)}</span><span className="text-taupe line-through">{money(p.price, currency)}</span><span className="text-umber">−{off}%</span></>) : <span>{money(p.price, currency)}</span>}</p>
        <p className="text-xs text-taupe">★ {p.rating.toFixed(1)} ({p.reviewCount})</p>
      </div>
    </article>);
}
