import { notFound, redirect } from "next/navigation";
import CmsPageView from "@/components/cms/CmsPageView";
import { getPageBySlug, viewerIsAdmin } from "@/lib/cms-data";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/cms-schema";
/**
 * Renders any CMS page at /<slug>. Static routes (/shop, /sale, /contact, ...) always win over this dynamic
 * route in Next.js, and reserved slugs are blocked in Admin → Pages, so CMS pages can never shadow the app.
 * Unpublished pages return 404 publicly; a signed-in admin sees them as a draft preview.
 */
async function load(slug) {
    if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug))
        return null;
    const live = await getPageBySlug(slug);
    if (live)
        return { data: live, draft: false };
    if (await viewerIsAdmin()) {
        const draft = await getPageBySlug(slug, true);
        if (draft)
            return { data: draft, draft: true };
    }
    return null;
}
export async function generateMetadata({ params }) {
    const { slug } = await params;
    const found = await load(slug);
    if (!found)
        return { title: "Page not found", robots: { index: false } };
    const { page } = found.data;
    const title = page.seo_title || page.title;
    const base = process.env.NEXT_PUBLIC_SITE_URL;
    const canonical = page.canonical_url || (base ? `${base.replace(/\/$/, "")}/${page.slug}` : undefined);
    return {
        title,
        ...(page.seo_description ? { description: page.seo_description } : {}),
        ...(canonical ? { alternates: { canonical } } : {}),
        openGraph: { title, ...(page.seo_description ? { description: page.seo_description } : {}) },
        // Drafts and "hidden" (unlisted) pages stay out of search engines.
        ...(found.draft || page.hidden ? { robots: { index: false, follow: false } } : {}),
    };
}
export default async function CmsPage({ params }) {
    const { slug } = await params;
    const found = await load(slug);
    if (!found)
        return notFound();
    if (found.data.page.is_home)
        redirect("/");
    return <CmsPageView data={found.data} draft={found.draft}/>;
}
