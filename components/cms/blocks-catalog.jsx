import Link from "next/link";
import ProductRow from "@/components/sections/ProductRow";
import Placeholder from "@/components/ui/Placeholder";
import SmartImage from "@/components/ui/SmartImage";
import { getCategories } from "@/lib/catalog";
import { getCollections } from "@/lib/cms-data";
import { pickProducts, selectProducts } from "@/lib/cms-products";
import { cLink, cList, cStr, resolveLink } from "@/lib/cms-schema";
export async function ProductGridBlock({ c, ctx }) {
    const items = await selectProducts(c);
    return <ProductRow title={cStr(c, "title")} href={resolveLink(cLink(c, "view_all"), ctx) ?? "/shop"} items={items}/>;
}
export async function FeaturedProductsBlock({ c, ctx }) {
    const items = await pickProducts(c);
    return <ProductRow title={cStr(c, "title")} href={resolveLink(cLink(c, "view_all"), ctx) ?? "/shop"} items={items}/>;
}
const tileList = "-mx-5 flex snap-x gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5";
export async function CategoryGridBlock({ c }) {
    const wanted = new Set(cList(c, "category_slugs"));
    const cats = (await getCategories()).filter((x) => !wanted.size || wanted.has(x.slug));
    if (!cats.length)
        return null;
    return (<section className="section container-site">
      {cStr(c, "title") && <h2 className="mb-10 font-display text-4xl md:text-5xl">{cStr(c, "title")}</h2>}
      <ul className={tileList}>
        {cats.map((x) => (<li key={x.slug} className="w-[62%] shrink-0 snap-start md:w-auto">
            <Link href={`/category/${x.slug}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden"><div className="relative h-full transition-transform duration-700 group-hover:scale-105"><SmartImage src={x.image_url} alt={x.name} sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 62vw" fallback={<Placeholder label={x.name} tone="cream"/>}/></div></div>
              <p className="mt-3 text-sm tracking-[0.12em] uppercase">{x.name}</p>
            </Link>
          </li>))}
      </ul>
    </section>);
}
export async function CollectionGridBlock({ c }) {
    const wanted = new Set(cList(c, "collection_slugs"));
    const cols = (await getCollections()).filter((x) => !wanted.size || wanted.has(x.slug));
    if (!cols.length)
        return null;
    return (<section className="section container-site">
      {cStr(c, "title") && <h2 className="mb-10 font-display text-4xl md:text-5xl">{cStr(c, "title")}</h2>}
      <ul className={tileList}>
        {cols.map((x) => (<li key={x.slug} className="w-[62%] shrink-0 snap-start md:w-auto">
            <Link href={`/collection/${x.slug}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden"><div className="relative h-full transition-transform duration-700 group-hover:scale-105"><SmartImage src={x.image_url} alt={x.title} sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 62vw" fallback={<Placeholder label={x.title} tone="cream"/>}/></div></div>
              <p className="mt-3 text-sm tracking-[0.12em] uppercase">{x.title}</p>
            </Link>
          </li>))}
      </ul>
    </section>);
}
