import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
export interface Block { title: string; body: string; cta_label: string; cta_href: string; image_url: string; published: boolean }
const B = (title: string, body = "", cta_label = "", cta_href = ""): Block => ({ title, body, cta_label, cta_href, image_url: "", published: true });
export const DEFAULTS: Record<string, Block> = {
  announcement: B("Free shipping on orders over $200"), hero: B("Define\nYour Style", "Modern Menswear for Every Occasion", "Shop Now", "/shop"),
  essentials: B("Essentials"), promo: B("Autumn Collection\nUp to 30% OFF", "Selected outerwear and tailoring, for a limited time.", "Shop collection", "/sale"),
  trending: B("Trending Now"), new_arrivals: B("New Arrivals"), editorial: B("Designed for\nEvery Move", "Cut for movement, finished to last: natural fabrics and quiet detail.", "Explore collection", "/shop"),
  featured: B("The Autumn Edit", "Layers in wool, cotton and leather.", "Shop collection", "/shop"), lookbook: B("The Lookbook", "Explore the latest silhouettes, textures and seasonal essentials.", "View lookbook", "/lookbook"),
  best_sellers: B("Best Sellers"), social: B("Follow along", "Styling notes and new arrivals on Instagram.", "Instagram", "#"), newsletter: B("Stay in Style", "Get updates on new arrivals, collections and private offers."),
};
export const getBlocks = cache(async (): Promise<Record<string, Block>> => {
  if (!hasSupabase()) return DEFAULTS;
  const { data } = await (await supabaseServer()).from("homepage_sections").select("key,content,published"); const out = { ...DEFAULTS };
  data?.forEach((r) => { if (r.key in DEFAULTS) out[r.key] = { ...DEFAULTS[r.key], ...(r.content as Partial<Block>), published: r.published }; });
  return out;
});
export interface ThemeSettings {
  warm: string;
  cream: string;
  sand: string;
  taupe: string;
  umber: string;
  charcoal: string;
  ink: string;
  font_sans: "system" | "arial" | "helvetica" | "asap";
  font_serif: "georgia" | "times" | "system";
  font_display: "georgia" | "times" | "asap" | "bebas";
}
export interface Settings extends ThemeSettings { store_name: string; contact_email: string; phone: string; instagram_url: string; bkash_number: string; bkash_instructions: string; theme?: Partial<ThemeSettings> }
export const DEFAULT_THEME: ThemeSettings = {
  warm: "#FBF9F6",
  cream: "#F3EEE6",
  sand: "#E4DACB",
  taupe: "#9C8B79",
  umber: "#5E4B3C",
  charcoal: "#262421",
  ink: "#000000",
  font_sans: "system",
  font_serif: "georgia",
  font_display: "bebas",
};
export const DEFAULT_SETTINGS: Settings = {
  store_name: "EUROPIUM", contact_email: "", phone: "", instagram_url: "", bkash_number: "", bkash_instructions: "Send the BDT amount confirmed by the store via bKash, then enter the transaction ID below. Payment will be verified manually before the order is confirmed.",
  ...DEFAULT_THEME,
};
export const getSettings = cache(async (): Promise<Settings> => {
  if (!hasSupabase()) return DEFAULT_SETTINGS;
  const { data } = await (await supabaseServer()).from("site_settings").select("value").eq("key", "general").maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<Settings>) ?? {}), ...(data?.value && typeof data.value === "object" ? { ...((data.value as Partial<Settings>).theme as Partial<ThemeSettings> ?? {}) } : {}) };
});
export const getPublicSettings = cache(async (): Promise<Settings> => {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return DEFAULT_SETTINGS;
  const { data } = await supabaseAdmin().from("site_settings").select("value").eq("key", "general").maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<Settings>) ?? {}) };
});
