import LegacyHome from "@/components/sections/LegacyHome";
import CmsPageView from "@/components/cms/CmsPageView";
import { getBlocks } from "@/lib/cms";
import { getHomePage } from "@/lib/cms-data";
export async function generateMetadata() {
    const home = await getHomePage();
    const p = home?.page;
    if (!p)
        return {};
    return {
        ...(p.seo_title ? { title: { absolute: p.seo_title } } : {}),
        ...(p.seo_description ? { description: p.seo_description } : {}),
        ...(p.canonical_url ? { alternates: { canonical: p.canonical_url } } : {}),
    };
}
/**
 * Homepage = the CMS page flagged is_home (sections ordered/hidden in Admin → Pages → Home).
 * If CMS data is missing or unavailable, the original built-in homepage renders instead, so the storefront never breaks.
 */
export default async function Home() {
    const home = await getHomePage();
    if (!home)
        return <LegacyHome />;
    const blocks = await getBlocks(); // announcement bar still lives in homepage_sections (edited in Admin → Navigation)
    return <CmsPageView data={home} bar={blocks.announcement.published ? blocks.announcement.title : undefined}/>;
}
