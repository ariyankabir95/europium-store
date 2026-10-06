import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import ProductCard from "@/components/products/ProductCard";
export default async function TrendingNow() {
    const items = [...(await getProducts())].sort((a, b) => b.sold - a.sold).slice(0, 8);
    return (<section className="section container-site" aria-labelledby="tr">
      <div className="mb-10 flex items-end justify-between"><h2 id="tr" className="font-display text-4xl md:text-5xl">Trending Now</h2><Link href="/shop" className="text-sm underline underline-offset-4">View all</Link></div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">{items.map((p) => <ProductCard key={p.id} product={p}/>)}</div>
    </section>);
}
