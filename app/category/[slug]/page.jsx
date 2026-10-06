import { notFound } from "next/navigation";
import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SmartImage from "@/components/ui/SmartImage";
import { getProducts, getCategories } from "@/lib/catalog";
// Clothing/footwear are virtual groups; every other slug comes from the categories table.
const groups = {
    clothing: { name: "Clothing", description: "Tailoring, knitwear and outerwear.", match: (c) => c !== "accessories" },
    footwear: { name: "Footwear", description: "Footwear is coming soon.", match: () => false },
};
async function find(slug) { if (groups[slug])
    return groups[slug]; const c = (await getCategories()).find((x) => x.slug === slug); return c && { ...c, match: (s) => s === slug }; }
export async function generateMetadata({ params }) { const c = await find((await params).slug); return c ? { title: c.name, description: c.description } : {}; }
export default async function Category({ params }) {
    const { slug } = await params;
    const c = await find(slug);
    if (!c)
        notFound();
    const products = await getProducts();
    return <Page title={c.name} intro={c.description}><Breadcrumbs items={[["Home", "/"], [c.name, `/category/${slug}`]]}/>{c.image_url && <SmartImage src={c.image_url} alt={`${c.name} category`} priority sizes="(min-width: 1440px) 1360px, 100vw" frameClassName="mb-10 aspect-[16/9] w-full bg-cream md:aspect-[21/8]"/>}<Catalog products={products.filter((p) => c.match(p.category))}/></Page>;
}
