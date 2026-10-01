import Link from "next/link";
import { getSettings } from "@/lib/cms";
const cols: Record<string, [string, string][]> = {
  Shop: [["New Arrivals", "/shop?sort=newest"], ["Clothing", "/category/clothing"], ["Footwear", "/category/footwear"], ["Accessories", "/category/accessories"], ["Sale", "/sale"]],
  Help: [["Contact", "/contact"], ["Shipping", "/shipping"], ["Returns", "/returns"], ["FAQ", "/faq"]],
  About: [["Our Story", "/about"], ["Lookbook", "/lookbook"], ["Journal", "/journal"]],
  Follow: [["Instagram", "#"], ["Facebook", "#"], ["TikTok", "#"], ["Pinterest", "#"]],
};
export default async function Footer() {
  const s = await getSettings();
  return (
    <footer className="border-t border-sand bg-cream">
      <div className="container-site grid gap-12 py-16 md:grid-cols-6">
        <div className="md:col-span-2"><p className="font-serif text-2xl tracking-[0.25em]">{s.store_name}</p><p className="mt-4 max-w-xs text-sm text-umber">Modern menswear in natural fabrics, made to last beyond the season.</p>{(s.contact_email || s.phone) && <p className="mt-3 text-sm text-umber">{s.contact_email}{s.contact_email && s.phone && " · "}{s.phone}</p>}</div>
        {Object.entries(cols).map(([t, ls]) => (
          <nav key={t} aria-label={t}><h2 className="mb-4 text-xs tracking-[0.18em] uppercase">{t}</h2>
            <ul className="space-y-3 text-sm text-umber">{ls.map(([l, h]) => <li key={l}><Link href={t === "Follow" && l === "Instagram" && s.instagram_url ? s.instagram_url : h} className="hover:text-ink">{l}</Link></li>)}</ul></nav>
        ))}
      </div>
      <div className="border-t border-sand"><div className="container-site flex flex-col justify-between gap-2 py-6 text-xs text-taupe md:flex-row"><p>© 2026 {s.store_name}. All rights reserved.</p><p className="space-x-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></p></div></div>
    </footer>
  );
}
