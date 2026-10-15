import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";

// Public catalog details are fetched on demand by the cart drawer, not in the global layout.
export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
