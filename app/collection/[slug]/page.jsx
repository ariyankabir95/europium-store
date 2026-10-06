import { notFound } from "next/navigation";
import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SmartImage from "@/components/ui/SmartImage";
import { normalizeImageUrl } from "@/lib/images";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { getProducts } from "@/lib/catalog";
export default async function CollectionPage({ params }) {
    const { slug } = await params;
    if (!hasSupabase())
        notFound();
    const sb = await supabaseServer();
    const { data: c } = await sb.from("collections").select("id,title,description,image_url").eq("slug", slug).eq("published", true).maybeSingle();
    if (!c)
        notFound();
    const { data: cp } = await sb.from("collection_products").select("products(slug)").eq("collection_id", c.id);
    const slugs = new Set((cp ?? []).map((r) => r.products?.slug));
    const items = (await getProducts()).filter((p) => slugs.has(p.slug));
    return <Page title={c.title} intro={c.description ?? ""}><Breadcrumbs items={[["Home", "/"], [c.title, `/collection/${slug}`]]}/>{normalizeImageUrl(c.image_url) && <SmartImage src={c.image_url} alt={`${c.title} collection`} priority sizes="(min-width: 1440px) 1360px, 100vw" frameClassName="mb-10 aspect-[16/9] w-full bg-cream md:aspect-[21/8]"/>}<Catalog products={items}/></Page>;
}
