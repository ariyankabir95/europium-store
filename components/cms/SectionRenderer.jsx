import AdsterraNativeBanner from "@/components/ads/AdsterraNativeBanner";
import { CtaBlock, HeroBlock, ImageBlock, ImageTextBlock, NewsletterBlock, PromoBannerBlock, RichTextBlock, SpacerBlock, TextBlock } from "@/components/cms/blocks-basic";
import { CategoryGridBlock, CollectionGridBlock, FeaturedProductsBlock, ProductGridBlock } from "@/components/cms/blocks-catalog";
/** Renders one CMS section by type. Sections are rendered in the order given (already sorted by `sort`). */
export default function SectionRenderer({ section, ctx, first }) {
    const c = section.content;
    switch (section.type) {
        case "hero": return <HeroBlock c={c} ctx={ctx} first={first}/>;
        case "text": return <TextBlock c={c} ctx={ctx}/>;
        case "image_text": return <ImageTextBlock c={c} ctx={ctx}/>;
        case "image": return <ImageBlock c={c} ctx={ctx}/>;
        case "product_grid": return <ProductGridBlock c={c} ctx={ctx}/>;
        case "featured_products": return <FeaturedProductsBlock c={c} ctx={ctx}/>;
        case "category_grid": return <CategoryGridBlock c={c} ctx={ctx}/>;
        case "collection_grid": return <CollectionGridBlock c={c} ctx={ctx}/>;
        case "promo_banner": return <PromoBannerBlock c={c} ctx={ctx}/>;
        case "rich_text": return <RichTextBlock c={c} ctx={ctx}/>;
        case "cta": return <CtaBlock c={c} ctx={ctx}/>;
        case "adsterra_native": return <AdsterraNativeBanner />;
        case "newsletter": return <NewsletterBlock c={c} ctx={ctx}/>;
        case "spacer": return <SpacerBlock c={c} ctx={ctx}/>;
        default: return null;
    }
}
