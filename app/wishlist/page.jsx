"use client";
import Link from "next/link";
import Page from "@/components/layout/Page";
import ProductCard from "@/components/products/ProductCard";
import { useStore } from "@/lib/store";
import { firstAvailableVariant } from "@/lib/variant";
export default function Wishlist() {
    const { products, wish, add, toggleWish } = useStore();
    const items = products.filter((p) => wish.includes(p.id));
    return (<Page title="Wishlist">
      {items.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4">{items.map((p) => { const v = firstAvailableVariant(p); return <div key={p.id}><ProductCard product={p}/><button disabled={!v} onClick={async () => { if (!v)
            return; const r = await add({ productId: p.id, size: v.size, color: v.color, qty: 1 }); if (r.status === "ok")
            toggleWish(p.id); }} className="btn-line mt-3 w-full" aria-label={`Move ${p.name} to cart`}>Move to cart</button></div>; })}</div>
            : <><p className="text-umber">Nothing saved yet. Tap the heart on any product to keep it here.</p><Link href="/shop" className="btn-dark mt-6">Browse the shop</Link></>}
    </Page>);
}
