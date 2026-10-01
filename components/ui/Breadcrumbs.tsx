import Link from "next/link";
export default function Breadcrumbs({ items }: { items: [string, string][] }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: base + href })) };
  return (<><nav aria-label="Breadcrumb" className="mb-6 text-xs text-taupe"><ol className="flex flex-wrap gap-2">{items.map(([n, h], i) => <li key={h}>{i < items.length - 1 ? <Link href={h} className="hover:underline">{n} /</Link> : <span aria-current="page">{n}</span>}</li>)}</ol></nav><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} /></>);
}
