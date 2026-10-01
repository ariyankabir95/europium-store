"use client";
import Link from "next/link";
import Page from "@/components/layout/Page";
import Placeholder from "@/components/ui/Placeholder";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
export default function Cart() {
  const { products, cart, setQty, remove } = useStore();
  const getProduct = (id: string) => products.find((p) => p.id === id);
  const lines = cart.map((l, i) => ({ ...l, i, p: getProduct(l.productId) })).filter((l) => l.p);
  const subtotal = lines.reduce((n, l) => n + (l.p!.salePrice ?? l.p!.price) * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= 200 ? 0 : 12;
  if (!lines.length) return <Page title="Your cart"><p className="text-umber">Your cart is empty.</p><Link href="/shop" className="btn-dark mt-6">Continue shopping</Link></Page>;
  return (
    <Page title="Your cart">
      <div className="grid gap-12 md:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-sand border-y border-sand">{lines.map((l) => (
          <li key={`${l.productId}-${l.size}-${l.color}`} className="flex gap-4 py-5">
            <div className="h-28 w-24 shrink-0"><Placeholder label="" /></div>
            <div className="flex-1 text-sm"><Link href={`/product/${l.p!.slug}`} className="font-medium hover:underline">{l.p!.name}</Link><p className="text-taupe">{l.size} / {l.color}</p><p className="mt-1">{money(l.p!.salePrice ?? l.p!.price)}</p>
              <div className="mt-3 flex items-center gap-3"><label className="sr-only" htmlFor={`q${l.i}`}>Quantity</label><input id={`q${l.i}`} type="number" min={1} max={10} value={l.qty} onChange={(e) => setQty(l.i, +e.target.value || 1)} className="min-h-11 w-16 border border-sand bg-transparent px-2" /><button onClick={() => remove(l.i)} className="min-h-11 underline">Remove</button></div></div>
          </li>))}</ul>
        <aside className="h-fit border border-sand p-6 text-sm"><h2 className="mb-4 text-xs tracking-[0.18em] uppercase">Order summary</h2>
          <dl className="space-y-2"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? money(shipping) : "Free"}</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>—</dd></div><div className="flex justify-between border-t border-sand pt-3 font-medium"><dt>Total</dt><dd>{money(subtotal + shipping)}</dd></div></dl>
          <Link href="/checkout" className="btn-dark mt-6 w-full">Proceed to checkout</Link>
          <Link href="/shop" className="btn-line mt-4 w-full">Continue shopping</Link></aside>
      </div>
    </Page>
  );
}
