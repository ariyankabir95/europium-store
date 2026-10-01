import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/catalog";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return [...["", "/shop", "/sale", "/lookbook", "/about", "/contact"].map((p) => ({ url: base + p })), ...categories.map((c) => ({ url: `${base}/category/${c.slug}` })), ...products.map((p) => ({ url: `${base}/product/${p.slug}` }))];
}
