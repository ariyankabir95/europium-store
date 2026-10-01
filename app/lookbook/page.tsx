import Link from "next/link";
import Page from "@/components/layout/Page";
import Placeholder from "@/components/ui/Placeholder";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
export const metadata = { title: "Lookbook", description: "Seasonal silhouettes, textures and essentials." };
interface Look { id: string; title: string; description: string | null; image_url: string | null; product_ids: string[] }
export default async function Lookbook() {
  let looks: Look[] = []; const names = new Map<string, string>(); const slugs = new Map<string, string>();
  if (hasSupabase()) { const sb = await supabaseServer(); const { data } = await sb.from("lookbook_items").select("id,title,description,image_url,product_ids").eq("published", true).order("sort"); looks = (data as Look[]) ?? [];
    const ids = looks.flatMap((l) => l.product_ids ?? []); if (ids.length) (await sb.from("products").select("id,name,slug").in("id", ids)).data?.forEach((p) => { names.set(p.id, p.name); slugs.set(p.id, p.slug); }); }
  else looks = [{ id: "a", title: "Autumn Tailoring", description: null, image_url: null, product_ids: [] }, { id: "b", title: "Weekend Layers", description: null, image_url: null, product_ids: [] }];
  return (<Page title="The Lookbook" intro="Explore the latest silhouettes, textures and seasonal essentials.">{!looks.length && <p className="text-umber">New looks are coming soon.</p>}<div className="grid gap-x-6 gap-y-14 md:grid-cols-2">{looks.map((l, n) => <article key={l.id} className={n % 3 === 0 ? "md:col-span-2" : ""}><div className={n % 3 === 0 ? "aspect-[16/10]" : "aspect-[4/5]"}>{l.image_url ? <img src={l.image_url} alt={l.title} loading="lazy" className="h-full w-full object-cover" /> : <Placeholder label={l.title} tone="cream" />}</div>
    <h2 className="mt-3 font-serif text-2xl">{l.title}</h2>{l.description && <p className="mt-1 max-w-xl text-sm text-umber">{l.description}</p>}<p className="mt-2 flex flex-wrap gap-x-4 text-sm">{l.product_ids?.map((id) => slugs.has(id) && <Link key={id} href={`/product/${slugs.get(id)}`} className="underline">{names.get(id)}</Link>)}</p></article>)}</div></Page>);
}
