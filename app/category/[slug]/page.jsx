import Link from "next/link";
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
async function find(slug) {
  if (groups[slug]) return groups[slug];
  const category = (await getCategories()).find((item) => item.slug === slug);
  return category ? { ...category, match: (value) => value === slug } : null;
}
export async function generateMetadata({ params }) {
  const c = await find((await params).slug);
  return c ? { title: c.name, description: c.description } : {};
}
export default async function Category({ params }) {
  const { slug } = await params;
  const [c, categories, products] = await Promise.all([find(slug), getCategories(), getProducts()]);
  if (!c) notFound();

  // Parent category pages include products assigned to any descendant category.
  const categorySlugs = new Set([slug]);
  const addDescendants = (parentId) => {
    for (const child of categories) {
      if (child.parent_id === parentId && !categorySlugs.has(child.slug)) {
        categorySlugs.add(child.slug);
        addDescendants(child.id);
      }
    }
  };
  if (c.id) addDescendants(c.id);
  const childCategories = c.id ? categories.filter((category) => category.parent_id === c.id) : [];
  const matchingProducts = products.filter((product) => categorySlugs.has(product.category) || c.match(product.category));

  return (
    <Page title={c.name} intro={c.description}>
      <Breadcrumbs items={[["Home", "/"], [c.name, `/category/${slug}`]]}/>
      {c.image_url && <SmartImage src={c.image_url} alt={`${c.name} category`} priority sizes="(min-width: 1440px) 1360px, 100vw" frameClassName="mb-10 aspect-[16/9] w-full bg-cream md:aspect-[21/8]"/>}
      {childCategories.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-2xl">Shop by subcategory</h2>
          <ul className="flex flex-wrap gap-3">
            {childCategories.map((category) => (
              <li key={category.id}>
                <Link href={`/category/${category.slug}`} className="inline-flex min-h-11 items-center border border-sand px-4 text-sm hover:bg-cream">{category.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Catalog products={matchingProducts}/>
    </Page>
  );
}
