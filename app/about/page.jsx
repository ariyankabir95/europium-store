import Link from "next/link";
import Page from "@/components/layout/Page";
import Placeholder from "@/components/ui/Placeholder";
export const metadata = { title: "Our story", description: "The thinking and craft behind EUROPIUM." };
const values = [
    { k: "100%", v: "Natural fibres" },
    { k: "Fewer", v: "Pieces, better made" },
    { k: "Built", v: "To improve with wear" },
];
export default function About() {
    return (<Page title="Our story">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-[4/5]">
          <Placeholder label="Atelier photography" tone="cream" className="absolute inset-0"/>
          <span className="absolute left-0 top-0 -translate-x-3 -translate-y-3 border border-sand bg-warm px-4 py-2 text-xs uppercase tracking-[0.18em] text-umber shadow-sm">Est. in the atelier</span>
        </div>
        <div className="self-center md:pl-4">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-taupe">Our story</p>
          <p className="font-display text-2xl leading-snug text-charcoal md:text-3xl">Menswear for people who dress the same way they work.</p>
          <div className="mt-6 max-w-md space-y-5 text-umber">
            <p>EUROPIUM makes menswear for people who dress the same way they work: with intent and without noise.</p>
            <p>We choose natural fibres, cut for movement, and finish garments so they improve with wear.</p>
            <p>Fewer pieces, better made, worn for years.</p>
          </div>
          <Link href="/shop" className="btn-line mt-8 inline-flex">Shop the collection</Link>
        </div>
      </div>

      <div className="section -mx-5 mt-16 bg-charcoal px-5 text-warm md:-mx-10 md:mt-24 md:px-10">
        <div className="grid gap-10 sm:grid-cols-3">
          {values.map((s) => (<div key={s.v} className="border-t border-warm/20 pt-6">
            <p className="font-display text-3xl tracking-tight md:text-4xl">{s.k}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-warm/70">{s.v}</p>
          </div>))}
        </div>
      </div>
    </Page>);
}
