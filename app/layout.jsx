import Script from "next/script";
import { Asap, Bebas_Neue } from "next/font/google";
import Footer from "@/components/layout/Footer";
import { getProducts } from "@/lib/catalog";
import { DEFAULT_SETTINGS, getPublicSettings } from "@/lib/cms";
import { getHeader } from "@/lib/cms-data";
import { NavProvider } from "@/components/layout/NavContext";
import CartDrawer from "@/components/cart/CartDrawer";
import AuthModal from "@/components/auth/AuthModal";
import CartToast from "@/components/cart/CartToast";
import Cursor from "@/components/ui/Cursor";
import { StoreProvider } from "@/lib/store";
import "./globals.css";
const asap = Asap({
    subsets: ["latin"],
    variable: "--font-asap",
    display: "swap",
});
const bebas = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-bebas",
    display: "swap",
});
const siteUrl = (() => { try {
    return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined;
}
catch {
    return undefined;
} })();
/**
 * Root metadata. The default browser title, the title template and the Open Graph site name all come from
 * Admin -> Settings -> Store name, so the name is configured in exactly one place. Page-specific titles and
 * descriptions set by individual routes still win over these defaults.
 */
export async function generateMetadata() {
    const { store_name } = await getPublicSettings();
    const name = store_name.trim() || DEFAULT_SETTINGS.store_name;
    return {
        ...(siteUrl ? { metadataBase: siteUrl } : {}),
        title: {
            default: name,
            template: `%s | ${name}`,
        },
        openGraph: {
            siteName: name,
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
        },
        description: "Modern menswear for every occasion: tailoring, knitwear, outerwear and accessories.",
    };
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const hexRgb = (value, fallback) => {
    const v = HEX.test(value) ? value : fallback;
    return `${parseInt(v.slice(1, 3), 16)} ${parseInt(v.slice(3, 5), 16)} ${parseInt(v.slice(5, 7), 16)}`;
};
const fonts = {
    sans: {
        system: "system-ui, sans-serif",
        arial: "Arial, Helvetica, sans-serif",
        helvetica: "Helvetica, Arial, sans-serif",
        asap: "var(--font-asap), Arial, Helvetica, sans-serif",
    },
    serif: {
        georgia: "Georgia, serif",
        times: '"Times New Roman", Times, serif',
        system: "system-ui, sans-serif",
    },
    display: {
        georgia: "Georgia, serif",
        times: '"Times New Roman", Times, serif',
        asap: "var(--font-asap), Arial, Helvetica, sans-serif",
        bebas: "var(--font-bebas), Impact, sans-serif",
    },
};
export default async function RootLayout({ children, }) {
    const [products, settings, header] = await Promise.all([
        getProducts(),
        getPublicSettings(),
        getHeader(),
    ]);
    const fontSans = fonts.sans[settings.font_sans] ??
        fonts.sans.system;
    const fontDisplay = fonts.display[settings.font_display] ?? fonts.display.georgia;
    const style = {
        "--theme-warm": hexRgb(settings.warm, "#FBF9F6"),
        "--theme-cream": hexRgb(settings.cream, "#F3EEE6"),
        "--theme-sand": hexRgb(settings.sand, "#E4DACB"),
        "--theme-taupe": hexRgb(settings.taupe, "#9C8B79"),
        "--theme-umber": hexRgb(settings.umber, "#5E4B3C"),
        "--theme-charcoal": hexRgb(settings.charcoal, "#262421"),
        "--theme-ink": hexRgb(settings.ink, "#000000"),
        "--font-sans": fontSans,
        "--font-serif": fonts.serif[settings.font_serif] ??
            fonts.serif.georgia,
        "--font-display": fontDisplay,
    };
    return (<html lang="en" className={`${asap.variable} ${bebas.variable}`} style={style}>
      <body>
          <Script
  id="adsterra-social-bar"
  src="https://pl31702073.profitableratecpmnetwork.com/43/6e/bd/436ebd30ddb03269f3c353ab0bcabf3b.js"
  strategy="afterInteractive"
/>
        <StoreProvider products={products}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-warm focus:p-3">
            Skip to content
          </a>

          <NavProvider header={header}>
            <Cursor />
            <CartDrawer />
            <AuthModal />
            <CartToast />

            {children}

            <Footer />
          </NavProvider>
        </StoreProvider>
      </body>
    </html>);
}
