import Link from "next/link";
import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Feature from "@/components/sections/Feature";
import Essentials from "@/components/sections/Essentials";
import TrendingNow from "@/components/sections/TrendingNow";
import ProductRow from "@/components/sections/ProductRow";
import Newsletter from "@/components/sections/Newsletter";
import { getBlocks } from "@/lib/cms";
import { getProducts } from "@/lib/catalog";
export default async function LegacyHome() {
    const [b, products] = await Promise.all([getBlocks(), getProducts()]);
    const newest = [...products].sort((a, c) => c.createdAt.localeCompare(a.createdAt)).slice(0, 4);
    const best = (products.some((p) => p.badge === "BESTSELLER") ? products.filter((p) => p.badge === "BESTSELLER") : [...products].sort((a, c) => c.sold - a.sold)).slice(0, 4);
    return (<><Header overlay bar={b.announcement.published ? b.announcement.title : undefined}/>
    <main id="main"><Hero b={b.hero}/>{b.essentials.published && <Essentials />}<Feature b={b.promo} tone="cream"/>{b.trending.published && <TrendingNow />}
      <ProductRow title={b.new_arrivals.title} href="/shop?sort=newest" items={newest} published={b.new_arrivals.published}/><Feature b={b.editorial} flip/><Feature b={b.featured} tone="cream"/><Feature b={b.lookbook} flip/>
      <ProductRow title={b.best_sellers.title} href="/shop" items={best} published={b.best_sellers.published}/>
      {b.social.published && <section className="container-site py-16 text-center"><h2 className="font-display text-3xl">{b.social.title}</h2><p className="mt-2 text-umber">{b.social.body}</p>{b.social.cta_label && <Link href={b.social.cta_href || "#"} className="btn-line mt-6">{b.social.cta_label}</Link>}</section>}
      {b.newsletter.published && <Newsletter title={b.newsletter.title} body={b.newsletter.body}/>}</main></>);
}
