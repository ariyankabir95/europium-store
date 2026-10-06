import { getPublicSettings } from "@/lib/cms";
import { getFooter } from "@/lib/cms-data";
import CmsLink from "@/components/cms/CmsLink";
/** Footer columns, links, text and the bottom legal row all come from Admin → Footer (with a built-in fallback). */
export default async function Footer() {
    const [s, f] = await Promise.all([getPublicSettings(), getFooter()]);
    // Kept from the original footer: an Instagram link left as "#" uses the Instagram URL from Admin → Settings.
    const hrefOf = (l) => (l.label.toLowerCase() === "instagram" && l.href === "#" && s.instagram_url ? s.instagram_url : l.href);
    return (<footer className="border-t border-sand bg-cream">
      <div className="container-site grid gap-12 py-16 md:grid-cols-6">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl tracking-[0.25em]">{s.store_name}</p>
          {f.aboutText && <p className="mt-4 max-w-xs text-sm text-umber">{f.aboutText}</p>}
          {(s.contact_email || s.phone) && <p className="mt-3 text-sm text-umber">{s.contact_email}{s.contact_email && s.phone && " · "}{s.phone}</p>}
        </div>
        {f.columns.map((col) => (<nav key={col.id} aria-label={col.title}>
            <h2 className="mb-4 text-xs tracking-[0.18em] uppercase">{col.title}</h2>
            <ul className="space-y-3 text-sm text-umber">
              {col.links.map((l) => <li key={l.id}><CmsLink href={hrefOf(l)} newTab={l.newTab} className="hover:text-ink">{l.label}</CmsLink></li>)}
            </ul>
          </nav>))}
      </div>
      <div className="border-t border-sand">
        <div className="container-site flex flex-col justify-between gap-2 py-6 text-xs text-taupe md:flex-row">
          <p>{f.copyrightText || `© ${new Date().getFullYear()} ${s.store_name}. All rights reserved.`}</p>
          {f.bottom.length > 0 && <p className="space-x-4">{f.bottom.map((l) => <CmsLink key={l.id} href={hrefOf(l)} newTab={l.newTab}>{l.label}</CmsLink>)}</p>}
        </div>
      </div>
    </footer>);
}
