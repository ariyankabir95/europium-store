const item = (label, href) => ({ id: `fb-${label}`, label, href, newTab: false });
export const FALLBACK_HEADER = {
    logoText: "EUROPIUM",
    items: [item("Home", "/"), item("Shop", "/shop"), item("Clothing", "/category/clothing"), item("Footwear", "/category/footwear"), item("Accessories", "/category/accessories"), item("Lookbook", "/lookbook"), item("Sale", "/sale")],
};
export const FALLBACK_FOOTER = {
    aboutText: "Modern menswear in natural fabrics, made to last beyond the season.",
    copyrightText: "",
    columns: [
        { id: "fb-shop", title: "Shop", links: [item("New Arrivals", "/shop?sort=newest"), item("Clothing", "/category/clothing"), item("Footwear", "/category/footwear"), item("Accessories", "/category/accessories"), item("Sale", "/sale")] },
        { id: "fb-help", title: "Help", links: [item("Contact", "/contact"), item("Shipping", "/shipping"), item("Returns", "/returns"), item("FAQ", "/faq")] },
        { id: "fb-about", title: "About", links: [item("Our Story", "/about"), item("Lookbook", "/lookbook"), item("Journal", "/journal")] },
        { id: "fb-follow", title: "Follow", links: [item("Instagram", "#"), item("Facebook", "#"), item("TikTok", "#"), item("Pinterest", "#")] },
    ],
    bottom: [item("Privacy", "/privacy"), item("Terms", "/terms")],
};
