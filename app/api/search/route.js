import { NextResponse } from "next/server";
import { getProducts, getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * Compact header typeahead. Returns matching category destinations as well as products,
 * so a query like "knitwear" can lead to the relevant shop category without leaving
 * the header unless the visitor deliberately chooses a result.
 */
export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [], categories: [], total: 0 });
  }

  const [products, allCategories] = await Promise.all([getProducts(), getCategories()]);
  const categoryMatches = allCategories
    .filter((category) =>
      [category.name, category.slug, category.description].join(" ").toLowerCase().includes(q)
    )
    .slice(0, 4)
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description ?? "",
    }));

  const productMatches = products.filter((product) =>
    [product.name, product.category, product.description, ...(product.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );

  const results = productMatches.slice(0, 8).map((product) => ({
    slug: product.slug,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice ?? null,
    image: product.images?.[0] ?? null,
    category: product.category ?? "",
  }));

  return NextResponse.json({
    results,
    categories: categoryMatches,
    total: productMatches.length,
  });
}
