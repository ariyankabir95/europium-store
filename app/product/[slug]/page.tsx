import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Page from "@/components/layout/Page";
import ProductDetail from "@/components/products/ProductDetail";
import ReviewForm from "@/components/products/ReviewForm";
import ProductCard from "@/components/products/ProductCard";
import { getProduct, getProducts } from "@/lib/catalog";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Reviews from "@/components/products/Reviews";
import RecentlyViewed from "@/components/products/RecentlyViewed";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const p = await getProduct((await params).slug); return p ? { title: p.name, description: p.description } : {}; }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug); if (!p) notFound();
  const products = await getProducts();
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  return (<Page><Breadcrumbs items={[["Home", "/"], ["Shop", "/shop"], [p.name, `/product/${p.slug}`]]} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, sku: p.id, offers: { "@type": "Offer", priceCurrency: "USD", price: p.salePrice ?? p.price, availability: "https://schema.org/InStock" } }).replace(/</g, "\\u003c") }} /><ProductDetail product={p} /><Reviews slug={p.slug} /><ReviewForm slug={p.slug} /><RecentlyViewed current={p.id} />{related.length > 0 && <section className="mt-24"><h2 className="mb-8 font-serif text-3xl">You may also like</h2><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div></section>}</Page>);
}
