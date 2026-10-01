import Link from "next/link";
import type { Block } from "@/lib/cms";
import Placeholder from "@/components/ui/Placeholder";
export default function Hero({ b }: { b: Block }) {
  return (
    <section className="relative h-[100svh] min-h-[560px] bg-charcoal text-warm">
      <div className="absolute inset-0">{b.image_url ? <img src={b.image_url} alt="" className="h-full w-full object-cover" /> : <Placeholder label="Hero image (set in Admin → Homepage)" tone="taupe" className="items-start" />}</div>
      <div className="absolute inset-0 bg-charcoal/30" />
      <div className="container-site relative flex h-full flex-col justify-end pb-16 md:justify-center md:pb-0"><h1 className="whitespace-pre-line font-display text-6xl leading-[0.95] md:text-8xl">{b.title}</h1><p className="mt-6 max-w-sm text-base md:text-lg">{b.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={b.cta_href || "/shop"} className="btn-light">{b.cta_label || "Shop Now"}</Link><Link href="/shop?sort=newest" className="btn-line text-warm">New Arrivals</Link></div></div>
    </section>
  );
}
