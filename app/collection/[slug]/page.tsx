import { notFound } from "next/navigation";
import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
import { getProducts } from "@/lib/catalog";
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; if (!hasSupabase()) notFound();
  const sb = await supabaseServer(); const { data: c } = await sb.from("collections").select("id,title,description,image_url").eq("slug", slug).eq("published", true).maybeSingle(); if (!c) notFound();
  const { data: cp } = await sb.from("collection_products").select("products(slug)").eq("collection_id", c.id);
  const slugs = new Set((cp ?? []).map((r) => (r.products as unknown as { slug: string } | null)?.slug)); const items = (await getProducts()).filter((p) => slugs.has(p.slug));
  return <Page title={c.title} intro={c.description ?? ""}><Breadcrumbs items={[["Home", "/"], [c.title, `/collection/${slug}`]]} />{c.image_url && <img src={c.image_url} alt="" className="mb-10 aspect-[16/6] w-full object-cover" />}<Catalog products={items} /></Page>;
}
