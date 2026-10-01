import { cache } from "react";
import type { Product } from "@/lib/types";
import { products as demo } from "@/data/products";
import { categories as demoCats } from "@/data/categories";
import { supabaseServer, hasSupabase } from "@/lib/supabase/server";
interface Row { slug: string; name: string; description: string | null; price_cents: number; sale_price_cents: number | null; tags: string[] | null; badge: Product["badge"] | null; materials: string | null; care: string | null; sold: number; created_at: string; categories: { slug: string } | null; product_images: { url: string; sort: number }[]; product_variants: { size: string | null; color_name: string | null; color_hex: string | null; stock: number; reserved: number; active: boolean }[]; reviews: { rating: number; status: string }[] }
const COLS = "slug,name,description,price_cents,sale_price_cents,tags,badge,materials,care,sold,created_at,categories(slug),product_images(url,sort),product_variants(size,color_name,color_hex,stock,reserved,active),reviews(rating,status)";
/** Published products from Supabase. Local demo data is used ONLY when Supabase env vars are absent (local dev). Product.id === slug. */
export const getProducts = cache(async (): Promise<Product[]> => {
  if (!hasSupabase()) return demo;
  const { data, error } = await (await supabaseServer()).from("products").select(COLS).eq("published", true);
  if (error || !data) return [];
  return (data as unknown as Row[]).map((r) => {
    // RLS already restricts anon/customer reads to active variants; filtered again here in case this runs under an admin session.
    const vs = (r.product_variants ?? []).filter((v) => v.active !== false); const rv = (r.reviews ?? []).filter((x) => x.status === "approved"); const colors = new Map<string, string>();
    vs.forEach((v) => v.color_name && colors.set(v.color_name, v.color_hex ?? "#cccccc"));
    return { id: r.slug, slug: r.slug, name: r.name, description: r.description ?? "", price: r.price_cents / 100, salePrice: r.sale_price_cents != null ? r.sale_price_cents / 100 : undefined, currency: "USD" as const, category: r.categories?.slug ?? "", tags: r.tags ?? [], badge: r.badge ?? undefined,
      images: [...(r.product_images ?? [])].sort((a, b) => a.sort - b.sort).map((i) => i.url), sizes: [...new Set(vs.map((v) => v.size).filter((s): s is string => !!s))], colors: [...colors].map(([name, hex]) => ({ name, hex })),
      variants: vs.filter((v): v is typeof v & { size: string; color_name: string } => !!v.size && !!v.color_name).map((v) => ({ size: v.size, color: v.color_name, available: v.stock - v.reserved > 0 })),
      rating: rv.length ? rv.reduce((n, x) => n + x.rating, 0) / rv.length : 0, reviewCount: rv.length, sold: r.sold, createdAt: r.created_at, materials: r.materials ?? "", care: r.care ?? "", inStock: vs.some((v) => v.stock - v.reserved > 0) };
  });
});
export const getCategories = cache(async (): Promise<{ slug: string; name: string; description: string; image_url?: string | null }[]> => {
  if (!hasSupabase()) return demoCats;
  const { data } = await (await supabaseServer()).from("categories").select("slug,name,description,image_url").eq("published", true).order("sort");
  return (data ?? []).map((d) => ({ ...d, description: d.description ?? "" }));
});
export const getProduct = async (slug: string) => (await getProducts()).find((p) => p.slug === slug);
