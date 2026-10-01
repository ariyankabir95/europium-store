import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { getProducts, getCategories } from "@/lib/catalog";
// Clothing/footwear are virtual groups; every other slug comes from the categories table.
const groups: Record<string, { name: string; description: string; match: (c: string) => boolean }> = {
  clothing: { name: "Clothing", description: "Tailoring, knitwear and outerwear.", match: (c) => c !== "accessories" },
  footwear: { name: "Footwear", description: "Footwear is coming soon.", match: () => false },
};
async function find(slug: string) { if (groups[slug]) return groups[slug]; const c = (await getCategories()).find((x) => x.slug === slug); return c && { ...c, match: (s: string) => s === slug }; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const c = await find((await params).slug); return c ? { title: c.name, description: c.description } : {}; }
export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const c = await find(slug); if (!c) notFound(); const products = await getProducts();
  return <Page title={c.name} intro={c.description}><Breadcrumbs items={[["Home", "/"], [c.name, `/category/${slug}`]]} /><Catalog products={products.filter((p) => c.match(p.category))} /></Page>;
}
