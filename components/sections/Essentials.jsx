import Link from "next/link";
import { getCategories } from "@/lib/catalog";
import Placeholder from "@/components/ui/Placeholder";
import SmartImage from "@/components/ui/SmartImage";
export default async function Essentials() {
    const categories = await getCategories();
    return (<section className="section container-site" aria-labelledby="ess">
      <h2 id="ess" className="mb-10 font-display text-4xl md:text-5xl">Essentials</h2>
      <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {categories.map((c) => (<li key={c.slug} className="w-[62%] shrink-0 snap-start md:w-auto">
            <Link href={`/category/${c.slug}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden"><div className="relative h-full transition-transform duration-700 group-hover:scale-105"><SmartImage src={c.image_url} alt={c.name} sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 62vw" fallback={<Placeholder label={c.name} tone="cream"/>}/></div></div>
              <p className="mt-3 text-sm tracking-[0.12em] uppercase">{c.name}</p>
            </Link>
          </li>))}
      </ul>
    </section>);
}
