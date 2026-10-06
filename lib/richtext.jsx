import Link from "next/link";
import { isExternal, safeUrl } from "@/lib/cms-schema";
/*
 * Tiny, dependency-free renderer for the Rich Text section.
 * Supports: # / ## / ### headings, **bold**, *italic*, [text](url), "- " bullet lists, blank-line paragraphs.
 * Output is built from React elements only (never raw HTML), and every link goes through safeUrl().
 */
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
function inline(src, keyBase) {
    return src.split(INLINE).filter(Boolean).map((part, i) => {
        const key = `${keyBase}-${i}`;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
            return <strong key={key}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
            return <em key={key}>{part.slice(1, -1)}</em>;
        const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (m) {
            const href = safeUrl(m[2]);
            if (!href)
                return <span key={key}>{m[1]}</span>;
            const cls = "underline underline-offset-4 hover:text-ink";
            return isExternal(href)
                ? <a key={key} href={href} className={cls} rel="noopener noreferrer" target="_blank">{m[1]}</a>
                : <Link key={key} href={href} className={cls}>{m[1]}</Link>;
        }
        return <span key={key}>{part}</span>;
    });
}
export function RichText({ source }) {
    const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    return (<div className="space-y-5 text-umber">
      {blocks.map((block, bi) => {
            const key = `b${bi}`;
            const lines = block.split("\n");
            if (lines.every((l) => /^[-*]\s+/.test(l))) {
                return <ul key={key} className="list-disc space-y-2 pl-5">{lines.map((l, li) => <li key={li}>{inline(l.replace(/^[-*]\s+/, ""), `${key}-${li}`)}</li>)}</ul>;
            }
            const h = /^(#{1,3})\s+(.*)$/.exec(block);
            if (h && lines.length === 1) {
                const cls = h[1].length === 1 ? "font-display text-4xl text-charcoal md:text-5xl" : h[1].length === 2 ? "font-display text-3xl text-charcoal md:text-4xl" : "font-serif text-2xl text-charcoal";
                return h[1].length === 1
                    ? <h2 key={key} className={cls}>{inline(h[2], key)}</h2>
                    : <h3 key={key} className={cls}>{inline(h[2], key)}</h3>;
            }
            return <p key={key} className="whitespace-pre-line">{inline(block, key)}</p>;
        })}
    </div>);
}
