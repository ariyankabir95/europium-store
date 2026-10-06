"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import ProductCard from "@/components/products/ProductCard";
export default function RecentlyViewed({ current }) {
    const { products } = useStore();
    const [ids, setIds] = useState([]);
    useEffect(() => { try {
        const prev = JSON.parse(localStorage.getItem("eu_recent") ?? "[]");
        setIds(prev.filter((i) => i !== current).slice(0, 4));
        localStorage.setItem("eu_recent", JSON.stringify([current, ...prev.filter((i) => i !== current)].slice(0, 8)));
    }
    catch { /* storage unavailable */ } }, [current]);
    const items = ids.map((i) => products.find((p) => p.id === i)).filter((p) => !!p);
    if (!items.length)
        return null;
    return <section className="mt-20"><h2 className="mb-8 font-serif text-3xl">Recently viewed</h2><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p}/>)}</div></section>;
}
