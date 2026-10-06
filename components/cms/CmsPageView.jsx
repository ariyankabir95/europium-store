import Header from "@/components/layout/Header";
import SectionRenderer from "@/components/cms/SectionRenderer";
import { getLinkCtx } from "@/lib/cms-data";
/**
 * Shared page shell for the CMS home page and /[slug] pages.
 * A hero as the first section gets the transparent overlay header (as the original homepage had);
 * otherwise the header is solid and the content is pushed below it.
 */
export default async function CmsPageView({ data, bar, draft = false }) {
    const ctx = await getLinkCtx();
    const heroFirst = data.sections[0]?.type === "hero";
    const pad = heroFirst ? "" : bar ? "pt-24 md:pt-28" : "pt-16 md:pt-20";
    return (<>
      <Header overlay={heroFirst} bar={bar}/>
      <main id="main" className={pad}>
        {draft && <p className="bg-charcoal px-5 py-2 text-center text-xs tracking-[0.12em] text-warm uppercase">Draft preview: this page is not public yet</p>}
        {!heroFirst && <h1 className="sr-only">{data.page.title}</h1>}
        {data.sections.map((s, i) => <SectionRenderer key={s.id} section={s} ctx={ctx} first={i === 0}/>)}
      </main>
    </>);
}
