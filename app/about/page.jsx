import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
  title: "Our story",
  description: "The thinking behind EUROPIUM: considered design, quiet confidence and pieces made to be worn on repeat.",
};

const principles = [
  { number: "01", title: "Intent over noise", copy: "Every detail earns its place. Nothing is added just to be noticed." },
  { number: "02", title: "Form follows feeling", copy: "Clean lines, thoughtful proportions and comfort that moves with you." },
  { number: "03", title: "Wear it your way", copy: "A wardrobe should work hard, feel personal and stay relevant beyond a season." },
];

export default function About() {
  return (
    <Page title="Our story" intro="A quieter point of view on everyday dressing.">
      <section className="grid overflow-hidden border border-sand bg-cream md:grid-cols-[0.92fr_1.08fr]">
        <div className="relative flex min-h-[390px] flex-col justify-between overflow-hidden bg-charcoal p-7 text-warm sm:min-h-[500px] sm:p-10 md:min-h-[620px]">
          <div className="absolute -right-16 top-20 h-64 w-64 rounded-full border border-warm/15 sm:h-80 sm:w-80" />
          <div className="absolute -right-4 top-32 h-48 w-48 rounded-full border border-warm/15 sm:h-64 sm:w-64" />
          <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-warm/65">
            <span>EUROPIUM / STUDIO</span>
            <span>EST. — 01</span>
          </div>
          <div className="relative -ml-2">
            <p className="font-display text-[clamp(8rem,22vw,17rem)] leading-[0.72] tracking-[-0.08em] text-warm">E<span className="text-taupe">.</span></p>
            <div className="mt-8 flex max-w-xs items-start gap-4 border-t border-warm/25 pt-4">
              <span className="mt-1 h-2 w-2 flex-none bg-taupe" />
              <p className="text-xs uppercase leading-relaxed tracking-[0.18em] text-warm/75">Considered essentials.<br />Distinct by design.</p>
            </div>
          </div>
          <div className="relative flex items-end justify-between border-t border-warm/20 pt-4 text-[10px] uppercase tracking-[0.2em] text-warm/55">
            <span>Form / Function / Feeling</span>
            <span>01 — 03</span>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
          <p className="mb-5 text-[10px] uppercase tracking-[0.24em] text-umber">The idea behind the label</p>
          <h2 className="max-w-xl font-display text-4xl leading-[1.02] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
            Less noise.<br /><span className="text-umber">More intention.</span>
          </h2>
          <div className="mt-7 max-w-lg space-y-5 text-sm leading-7 text-umber sm:text-base sm:leading-8">
            <p>EUROPIUM is built around a simple idea: what you wear should feel considered, not complicated.</p>
            <p>We look to the balance between structure and ease, understated details and a strong point of view. Pieces are designed to work together, move with real life and let your own character lead.</p>
            <p>Our approach is minimal, never empty. Every line, texture and proportion should have a reason to be there.</p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-dark">Explore the collection</Link>
            <Link href="/contact" className="btn-line">Get in touch</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="mb-10 flex flex-col justify-between gap-4 border-b border-sand pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-taupe">What guides us</p>
            <h2 className="font-display text-3xl tracking-tight text-charcoal sm:text-4xl">The EUROPIUM point of view</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-umber">A few principles. One consistent feeling: modern, grounded and quietly confident.</p>
        </div>
        <div className="grid gap-px border border-sand bg-sand md:grid-cols-3">
          {principles.map((item) => (
            <article key={item.number} className="group bg-warm p-6 transition-colors duration-300 hover:bg-cream sm:p-8">
              <p className="mb-12 font-display text-3xl text-taupe transition-colors group-hover:text-umber">{item.number}</p>
              <h3 className="font-serif text-xl text-charcoal sm:text-2xl">{item.title}</h3>
              <p className="mt-4 text-sm leading-6 text-umber">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-sand px-6 py-10 sm:px-10 sm:py-14 md:px-16">
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-umber/15" />
        <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-umber">Wear what feels like you</p>
            <h2 className="font-display text-3xl leading-tight tracking-tight text-charcoal sm:text-4xl md:text-5xl">A wardrobe with room to be yourself.</h2>
          </div>
          <Link href="/shop" className="btn-dark shrink-0">Shop EUROPIUM</Link>
        </div>
      </section>
    </Page>
  );
}
