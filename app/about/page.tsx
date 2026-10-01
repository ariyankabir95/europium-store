import Page from "@/components/layout/Page";
import Placeholder from "@/components/ui/Placeholder";
export const metadata = { title: "Our story", description: "The thinking and craft behind EUROPIUM." };
export default function About() {
  return (<Page title="Our story"><div className="grid gap-10 md:grid-cols-2 md:gap-16"><div className="aspect-[4/5]"><Placeholder label="Atelier photography" tone="cream" /></div><div className="max-w-md space-y-5 self-center text-umber"><p>EUROPIUM makes menswear for people who dress the same way they work: with intent and without noise.</p><p>We choose natural fibres, cut for movement, and finish garments so they improve with wear.</p><p>Fewer pieces, better made, worn for years.</p></div></div></Page>);
}
