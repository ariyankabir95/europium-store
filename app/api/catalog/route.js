import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";

// Public catalog details are fetched on demand by the cart drawer, not in the global layout.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getProducts({ strict: true });
    return NextResponse.json(products, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    // Do not turn a database outage into a successful empty catalog response.
    // Cart and checkout-adjacent UI can now show a retry state instead of a false empty cart.
    return NextResponse.json(
      { error: "The product catalog is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Cache-Control": "private, no-store", "Retry-After": "30" } },
    );
  }
}
