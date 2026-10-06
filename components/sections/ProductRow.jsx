import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
export default function ProductRow({ title, href, items, published = true }) {
    if (!published || !items.length)
        return null;
    return <section className="section container-site"><div className="mb-10 flex items-end justify-between"><h2 className="font-display text-4xl md:text-5xl">{title}</h2><Link href={href} className="text-sm underline underline-offset-4">View all</Link></div><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">{items.map((p) => <ProductCard key={p.id} product={p}/>)}</div></section>;
}
