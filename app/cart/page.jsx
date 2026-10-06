"use client";
import Link from "next/link";
import Page from "@/components/layout/Page";
import Placeholder from "@/components/ui/Placeholder";
import SmartImage from "@/components/ui/SmartImage";
import { useStore } from "@/lib/store";
import AuthGate from "@/components/auth/AuthGate";
import { money, FREE_SHIPPING_MIN_BDT, SHIPPING_FEE_BDT } from "@/lib/format";
function CartContents() {
    const { products, cart, setQty, remove, currency } = useStore();
    const getProduct = (id) => products.find((p) => p.id === id);
    const lines = cart.map((l, i) => ({ ...l, i, p: getProduct(l.productId) })).filter((l) => l.p);
    const subtotal = lines.reduce((n, l) => n + (l.p.salePrice ?? l.p.price) * l.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_MIN_BDT ? 0 : SHIPPING_FEE_BDT;
    if (!lines.length)
        return <Page title="Your cart"><p className="text-umber">Your cart is empty.</p><Link href="/shop" className="btn-dark mt-6">Continue shopping</Link></Page>;
    return (<Page title="Your cart">
      <div className="grid gap-12 md:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-sand border-y border-sand">{lines.map((l) => (<li key={`${l.productId}-${l.size}-${l.color}`} className="flex gap-4 py-5">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden"><SmartImage src={l.p.images[0]} alt={l.p.name} sizes="96px" fallback={<Placeholder label=""/>}/></div>
            <div className="flex-1 text-sm"><Link href={`/product/${l.p.slug}`} className="font-medium hover:underline">{l.p.name}</Link><p className="text-taupe">{l.size} / {l.color}</p><p className="mt-1">{money(l.p.salePrice ?? l.p.price, currency)}</p>
              <div className="mt-3 flex items-center gap-3"><label className="sr-only" htmlFor={`q${l.i}`}>Quantity</label><input id={`q${l.i}`} type="number" min={1} max={10} value={l.qty} onChange={(e) => setQty(l.i, +e.target.value || 1)} className="min-h-11 w-16 border border-sand bg-transparent px-2"/><button onClick={() => remove(l.i)} className="min-h-11 underline">Remove</button></div></div>
          </li>))}</ul>
        <aside className="h-fit border border-sand p-6 text-sm"><h2 className="mb-4 text-xs tracking-[0.18em] uppercase">Order summary</h2>
          <dl className="space-y-2"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal, currency)}</dd></div><div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? money(shipping, currency) : "Free"}</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>—</dd></div><div className="flex justify-between border-t border-sand pt-3 font-medium"><dt>Total</dt><dd>{money(subtotal + shipping, currency)}</dd></div></dl>
          {currency !== "BDT" && <p className="mt-3 text-xs text-umber">Payment is made in BDT via bKash. Estimated total: {money(subtotal + shipping, "BDT")}</p>}
          <Link href="/checkout" className="btn-dark mt-6 w-full">Proceed to checkout</Link>
          <Link href="/shop" className="btn-line mt-4 w-full">Continue shopping</Link></aside>
      </div>
    </Page>);
}
export default function Cart() {
    return <AuthGate title="Your cart" message="Sign in or create an account to view your cart."><CartContents /></AuthGate>;
}
