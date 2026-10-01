
import type { Metadata } from "next";
import { Asap, Bebas_Neue } from "next/font/google";

import Footer from "@/components/layout/Footer";
import { getProducts } from "@/lib/catalog";
import { getPublicSettings } from "@/lib/cms";
import CartDrawer from "@/components/cart/CartDrawer";
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

export const metadata: Metadata = {
  title: {
    default: "EUROPIUM — Modern Menswear",
    template: "%s | EUROPIUM",
  },
  openGraph: {
    siteName: "EUROPIUM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  description:
    "Modern menswear for every occasion: tailoring, knitwear, outerwear and accessories.",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

const hexRgb = (value: string, fallback: string) => {
  const v = HEX.test(value) ? value : fallback;

  return `${parseInt(v.slice(1, 3), 16)} ${parseInt(
    v.slice(3, 5),
    16
  )} ${parseInt(v.slice(5, 7), 16)}`;
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
} as const;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, settings] = await Promise.all([
    getProducts(),
    getPublicSettings(),
  ]);

  const fontSans =
    fonts.sans[settings.font_sans as keyof typeof fonts.sans] ??
    fonts.sans.system;

  const fontDisplay =
    fonts.display[
      settings.font_display as keyof typeof fonts.display
    ] ?? fonts.display.georgia;

  const style = {
    "--theme-warm": hexRgb(settings.warm, "#FBF9F6"),
    "--theme-cream": hexRgb(settings.cream, "#F3EEE6"),
    "--theme-sand": hexRgb(settings.sand, "#E4DACB"),
    "--theme-taupe": hexRgb(settings.taupe, "#9C8B79"),
    "--theme-umber": hexRgb(settings.umber, "#5E4B3C"),
    "--theme-charcoal": hexRgb(settings.charcoal, "#262421"),
    "--theme-ink": hexRgb(settings.ink, "#000000"),

    "--font-sans": fontSans,
    "--font-serif":
      fonts.serif[settings.font_serif as keyof typeof fonts.serif] ??
      fonts.serif.georgia,
    "--font-display": fontDisplay,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      className={`${asap.variable} ${bebas.variable}`}
      style={style}
    >
      <body>
        <StoreProvider products={products}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-warm focus:p-3"
          >
            Skip to content
          </a>

          <Cursor />
          <CartDrawer />

          {children}

          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}

