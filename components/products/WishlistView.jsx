"use client";

import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
import { useStore } from "@/lib/store";
import { firstAvailableVariant } from "@/lib/variant";

export default function WishlistView({ products }) {
  const { wish, add, toggleWish } = useStore();
  const items = products.filter((product) => wish.includes(product.id));

  return items.length ? (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4">
      {items.map((product) => {
        const variant = firstAvailableVariant(product);
        return (
          <div key={product.id}>
            <ProductCard product={product} />
            <button
              disabled={!variant}
              onClick={async () => {
                if (!variant) return;
                const result = await add({
                  productId: product.id,
                  size: variant.size,
                  color: variant.color,
                  qty: 1,
                });
                if (result.status === "ok") toggleWish(product.id);
              }}
              className="btn-line mt-3 w-full"
              aria-label={`Move ${product.name} to cart`}
            >
              Move to cart
            </button>
          </div>
        );
      })}
    </div>
  ) : (
    <>
      <p className="text-umber">Nothing saved yet. Tap the heart on any product to keep it here.</p>
      <Link href="/shop" className="btn-dark mt-6">Browse the shop</Link>
    </>
  );
}
