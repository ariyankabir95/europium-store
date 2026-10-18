"use client";
import { useEffect, useState } from "react";
import ProductCard from "@/components/products/ProductCard";
/*
 * Fetches its own product details from /api/catalog, same pattern as components/cart/CartDrawer.jsx.
 * Previously this read `products` off useStore(), but the store never provides that field (it only ever
 * holds cart/wishlist/currency state) -- `products` was always undefined, so `products.find(...)` below
 * threw and crashed the ENTIRE product page (via the error boundary) any time the visitor had at least
 * one id in their "recently viewed" history. Fetching the catalog locally, scoped to just this component,
 * fixes that without depending on a global products list that doesn't exist.
 */
export default function RecentlyViewed({ current }) {
    const [ids, setIds] = useState([]);
    const [products, setProducts] = useState([]);
    useEffect(() => { try {
        const prev = JSON.parse(localStorage.getItem("eu_recent") ?? "[]");
        setIds(prev.filter((i) => i !== current).slice(0, 4));
        localStorage.setItem("eu_recent", JSON.stringify([current, ...prev.filter((i) => i !== current)].slice(0, 8)));
    }
    catch { /* storage unavailable */ } }, [current]);
    useEffect(() => {
        if (!ids.length)
            return;
        const controller = new AbortController();
        fetch("/api/catalog", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => { if (!controller.signal.aborted)
                setProducts(Array.isArray(d) ? d : []); })
            .catch((e) => { if (e.name !== "AbortError" && !controller.signal.aborted)
                setProducts([]); });
        return () => controller.abort();
    }, [ids]);
    const items = ids.map((i) => products.find((p) => p.id === i)).filter((p) => !!p);
    if (!items.length)
        return null;
    return <section className="mt-20"><h2 className="mb-8 font-serif text-3xl">Recently viewed</h2><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p}/>)}</div></section>;
}
