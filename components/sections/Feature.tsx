import Link from "next/link";
import type { Block } from "@/lib/cms";
import Placeholder from "@/components/ui/Placeholder";
export default function Feature({ b, flip = false, tone = "warm" }: { b: Block; flip?: boolean; tone?: "warm" | "cream" }) {
  if (!b.published) return null;
  return (
    <section className={`py-16 md:py-24 ${tone === "cream" ? "bg-cream" : ""}`}><div className="container-site grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={`aspect-[4/5] overflow-hidden md:aspect-[5/6] ${flip ? "md:order-2" : ""}`}>{b.image_url ? <img src={b.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Placeholder label={b.title.replace("\n", " ")} tone="cream" />}</div>
      <div className="max-w-md"><h2 className="whitespace-pre-line font-display text-4xl md:text-6xl">{b.title}</h2>{b.body && <p className="mt-5 text-umber">{b.body}</p>}{b.cta_label && <Link href={b.cta_href || "/shop"} className="btn-dark mt-8">{b.cta_label}</Link>}</div>
    </div></section>
  );
}
