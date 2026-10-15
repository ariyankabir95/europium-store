import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/*
 * Lightweight typeahead for the header's inline search overlay (see components/layout/SearchOverlay.jsx).
 * Deliberately separate from /search (components/products/Catalog.jsx): that page does full filtering
 * (size, color, price, sort) client-side over the whole catalog and is still the place "view all results"
 * links to. This route only needs to answer "what matches this text, give me a few thumbnails" fast, without
 * shipping the whole catalog to the client on every keystroke.
 */
const eff = (p) => p.salePrice ?? p.price;

export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const products = await getProducts();
  const matches = products.filter((p) =>
    [p.name, p.category, p.description, ...(p.tags ?? [])].join(" ").toLowerCase().includes(q)
  );

  const results = matches.slice(0, 8).map((p) => ({
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.images?.[0] ?? null,
  }));

  return NextResponse.json({ results, total: matches.length });
}
