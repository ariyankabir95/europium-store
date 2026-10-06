import Placeholder from "@/components/ui/Placeholder";
import Newsletter from "@/components/sections/Newsletter";
import CmsLink from "@/components/cms/CmsLink";
import { RichText } from "@/lib/richtext";
import { cBool, cLink, cStr, resolveLink } from "@/lib/cms-schema";
const BG = { warm: "", cream: "bg-cream", sand: "bg-sand" };
const bg = (c) => BG[cStr(c, "tone", "warm")] ?? "";
const href = (c, k, ctx) => resolveLink(cLink(c, k), ctx);
export function HeroBlock({ c, ctx, first }) {
    const h = cStr(c, "height", "full");
    const size = h === "medium" ? "h-[60svh] min-h-[400px]" : h === "tall" ? "h-[80svh] min-h-[480px]" : "h-[100svh] min-h-[560px]";
    const primary = href(c, "cta", ctx) ?? "/shop";
    const second = cStr(c, "cta2_label") ? href(c, "cta2", ctx) : null;
    const img = cStr(c, "image_url");
    const Title = first ? "h1" : "h2";
    return (<section className={`relative bg-charcoal text-warm ${size}`}>
      <div className="absolute inset-0">{img ? <img src={img} alt="" className="h-full w-full object-cover"/> : <Placeholder label="Hero image (set in Admin → Pages)" tone="taupe" className="items-start"/>}</div>
      <div className="absolute inset-0 bg-charcoal/30"/>
      <div className="container-site relative flex h-full flex-col justify-end pb-16 md:justify-center md:pb-0">
        <Title className="whitespace-pre-line font-display text-6xl leading-[0.95] md:text-8xl">{cStr(c, "title")}</Title>
        {cStr(c, "body") && <p className="mt-6 max-w-sm text-base md:text-lg">{cStr(c, "body")}</p>}
        {(cStr(c, "cta_label") || second) && (<div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {cStr(c, "cta_label") && <CmsLink href={primary} className="btn-light">{cStr(c, "cta_label")}</CmsLink>}
            {second && <CmsLink href={second} className="btn-line text-warm">{cStr(c, "cta2_label")}</CmsLink>}
          </div>)}
      </div>
    </section>);
}
export function TextBlock({ c }) {
    const narrow = cStr(c, "width", "narrow") === "narrow";
    const center = cStr(c, "align", "left") === "center";
    const paras = cStr(c, "body").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return (<section className={`py-16 md:py-24 ${bg(c)}`}>
      <div className={`container-site ${center ? "text-center" : ""}`}>
        <div className={`${narrow ? "max-w-2xl" : "max-w-4xl"} ${center ? "mx-auto" : ""}`}>
          {cStr(c, "title") && <h2 className="whitespace-pre-line font-display text-4xl md:text-5xl">{cStr(c, "title")}</h2>}
          <div className={`space-y-4 text-umber ${cStr(c, "title") ? "mt-5" : ""}`}>{paras.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
        </div>
      </div>
    </section>);
}
export function ImageTextBlock({ c, ctx }) {
    const flip = cBool(c, "flip");
    const img = cStr(c, "image_url");
    const link = cStr(c, "cta_label") ? href(c, "cta", ctx) : null;
    const title = cStr(c, "title");
    return (<section className={`py-16 md:py-24 ${bg(c)}`}>
      <div className="container-site grid items-center gap-8 md:grid-cols-2 md:gap-16">
        <div className={`aspect-[4/5] overflow-hidden md:aspect-[5/6] ${flip ? "md:order-2" : ""}`}>
          {img ? <img src={img} alt={cStr(c, "image_alt")} loading="lazy" className="h-full w-full object-cover"/> : <Placeholder label={title.replace("\n", " ") || "Image"} tone="cream"/>}
        </div>
        <div className="max-w-md">
          {title && <h2 className="whitespace-pre-line font-display text-4xl md:text-6xl">{title}</h2>}
          {cStr(c, "body") && <p className="mt-5 whitespace-pre-line text-umber">{cStr(c, "body")}</p>}
          {link && <CmsLink href={link} className="btn-dark mt-8">{cStr(c, "cta_label")}</CmsLink>}
        </div>
      </div>
    </section>);
}
export function ImageBlock({ c, ctx }) {
    const img = cStr(c, "image_url");
    if (!img)
        return null;
    const aspect = cStr(c, "aspect", "auto");
    const full = cStr(c, "width", "contained") === "full";
    const link = href(c, "link", ctx);
    const picture = (<img src={img} alt={cStr(c, "image_alt")} loading="lazy" className={`w-full object-cover ${aspect === "auto" ? "h-auto" : "h-full"}`}/>);
    const framed = aspect === "auto" ? picture : <div className="w-full overflow-hidden" style={{ aspectRatio: aspect }}>{picture}</div>;
    return (<section className={full ? "" : "py-10 md:py-16"}>
      <figure className={full ? "" : "container-site"}>
        {link ? <CmsLink href={link} className="block">{framed}</CmsLink> : framed}
        {cStr(c, "caption") && <figcaption className={`mt-3 text-sm text-umber ${full ? "container-site" : ""}`}>{cStr(c, "caption")}</figcaption>}
      </figure>
    </section>);
}
export function PromoBannerBlock({ c, ctx }) {
    const tone = cStr(c, "tone", "charcoal");
    const dark = tone === "charcoal";
    const img = cStr(c, "image_url");
    const link = cStr(c, "cta_label") ? href(c, "cta", ctx) : null;
    const surface = img ? "bg-charcoal text-warm" : dark ? "bg-charcoal text-warm" : tone === "sand" ? "bg-sand text-charcoal" : "bg-cream text-charcoal";
    const onDark = img || dark;
    return (<section className={`relative overflow-hidden ${surface}`}>
      {img && <><img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-charcoal/40"/></>}
      <div className="container-site relative py-16 text-center md:py-24">
        <h2 className="whitespace-pre-line font-display text-4xl md:text-6xl">{cStr(c, "title")}</h2>
        {cStr(c, "body") && <p className="mx-auto mt-4 max-w-xl whitespace-pre-line">{cStr(c, "body")}</p>}
        {link && <CmsLink href={link} className={`${onDark ? "btn-light" : "btn-dark"} mt-8`}>{cStr(c, "cta_label")}</CmsLink>}
      </div>
    </section>);
}
export function RichTextBlock({ c }) {
    const narrow = cStr(c, "width", "narrow") === "narrow";
    return (<section className={`py-16 md:py-24 ${bg(c)}`}>
      <div className="container-site">
        <div className={narrow ? "max-w-2xl" : "max-w-4xl"}>
          {cStr(c, "title") && <h2 className="mb-6 font-display text-4xl md:text-5xl">{cStr(c, "title")}</h2>}
          <RichText source={cStr(c, "body")}/>
        </div>
      </div>
    </section>);
}
export function CtaBlock({ c, ctx }) {
    const link = cStr(c, "cta_label") ? href(c, "cta", ctx) : null;
    const btn = cStr(c, "style", "dark") === "line" ? "btn-line" : "btn-dark";
    return (<section className={bg(c)}>
      <div className="container-site py-16 text-center">
        <h2 className="whitespace-pre-line font-display text-3xl md:text-4xl">{cStr(c, "title")}</h2>
        {cStr(c, "body") && <p className="mt-2 whitespace-pre-line text-umber">{cStr(c, "body")}</p>}
        {link && <CmsLink href={link} className={`${btn} mt-6`}>{cStr(c, "cta_label")}</CmsLink>}
      </div>
    </section>);
}
export function NewsletterBlock({ c }) {
    return <Newsletter title={cStr(c, "title", "Stay in Style")} body={cStr(c, "body")}/>;
}
export function SpacerBlock({ c }) {
    const h = cStr(c, "height", "md");
    return <div aria-hidden="true" className={h === "sm" ? "h-8" : h === "lg" ? "h-32" : "h-16"}/>;
}
