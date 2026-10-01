"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Page from "@/components/layout/Page";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
const fields = [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"], ["line1", "Address"], ["city", "City"], ["state", "State"], ["postalCode", "Postal code"], ["country", "Country"]] as const;
type StoreConfig = { bkash_number: string; bkash_instructions: string };
type CheckoutResponse = { orderId: string; paymentConfigured?: boolean; paymentMethod?: string; error?: string };
export default function Checkout() {
  const { products, cart, clear } = useStore();
  const getProduct = (id: string) => products.find((p) => p.id === id);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState<{ id: string; txid: string } | null>(null);
  const [config, setConfig] = useState<StoreConfig>({ bkash_number: "", bkash_instructions: "" });
  const lines = cart.map((l) => ({ ...l, p: getProduct(l.productId) })).filter((l) => l.p);
  const subtotal = lines.reduce((n, l) => n + (l.p!.salePrice ?? l.p!.price) * l.qty, 0);
  useEffect(() => { fetch("/api/store-config", { cache: "no-store" }).then((r) => r.json()).then((j) => setConfig({ bkash_number: String(j.bkash_number ?? ""), bkash_instructions: String(j.bkash_instructions ?? "") })).catch(() => undefined); }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const fd = new FormData(e.currentTarget);
    const body = { ...Object.fromEntries(fd), items: lines.map((l) => ({ slug: l.p!.slug, size: l.size, color: l.color, qty: l.qty })) };
    const paymentReference = String(fd.get("paymentReference") ?? "");
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json() as CheckoutResponse;
      if (r.ok) { clear(); setDone({ id: j.orderId, txid: paymentReference }); } else setErr(j.error ?? "Something went wrong.");
    }
    catch { setErr("Network error. Please try again."); } finally { setBusy(false); }
  }
  if (done) return <Page title="Order received"><div className="max-w-lg space-y-3 text-umber"><p>Order #{done.id.slice(0, 8)} has been recorded as <strong>pending payment verification</strong>.</p><p>Payment method: <strong>bKash (manual)</strong></p><p>Transaction ID: <strong>{done.txid}</strong></p><p>We will verify the transaction before confirming the order.</p></div><Link href="/shop" className="btn-dark mt-6">Continue shopping</Link></Page>;
  if (!lines.length) return <Page title="Checkout"><p className="text-umber">Your cart is empty.</p><Link href="/shop" className="btn-dark mt-6">Browse the shop</Link></Page>;
  const paymentReady = Boolean(config.bkash_number.trim());
  return (
    <Page title="Checkout">
      <form onSubmit={submit} className="grid gap-12 md:grid-cols-[1fr_320px]">
        <div className="grid gap-5 sm:grid-cols-2">{fields.map(([n, l]) => <div key={n} className={n === "line1" || n === "email" ? "sm:col-span-2" : ""}><label htmlFor={n} className="mb-1 block text-sm">{l}</label><input id={n} name={n} type={n === "email" ? "email" : n === "phone" ? "tel" : "text"} required className="min-h-11 w-full border border-sand bg-transparent px-3" /></div>)}
          <div className="sm:col-span-2"><label htmlFor="coupon" className="mb-1 block text-sm">Coupon (optional)</label><input id="coupon" name="coupon" className="min-h-11 w-full border border-sand bg-transparent px-3" /></div>
          <div className="sm:col-span-2 border border-sand p-5"><p className="text-xs tracking-[0.18em] uppercase">Payment</p><div className="mt-4 flex items-start gap-3"><input id="bkash_manual" type="radio" name="paymentMethod" value="bkash_manual" defaultChecked className="mt-1" /><label htmlFor="bkash_manual" className="text-sm"><strong>bKash — manual verification</strong><br /><span className="text-taupe">{paymentReady ? `Send payment to ${config.bkash_number}` : "Configure a bKash number in Admin → Settings first."}</span></label></div>{paymentReady && <><p className="mt-4 whitespace-pre-line text-sm text-umber">{config.bkash_instructions}</p><label htmlFor="paymentReference" className="mt-4 mb-1 block text-sm">bKash transaction ID</label><input id="paymentReference" name="paymentReference" required minLength={4} maxLength={80} className="min-h-11 w-full border border-sand bg-transparent px-3" placeholder="Enter your TrxID" /></>}</div></div>
        <aside className="h-fit border border-sand p-6 text-sm"><h2 className="mb-4 text-xs tracking-[0.18em] uppercase">Order summary</h2>
          <ul className="space-y-2">{lines.map((l) => <li key={`${l.productId}${l.size}${l.color}`} className="flex justify-between"><span>{l.p!.name} × {l.qty}</span><span>{money((l.p!.salePrice ?? l.p!.price) * l.qty)}</span></li>)}</ul>
          <p className="mt-4 flex justify-between border-t border-sand pt-3 font-medium"><span>Subtotal</span><span>{money(subtotal)}</span></p><p className="mt-1 text-xs text-taupe">Shipping and coupon discounts are calculated on the server when you place the order.</p>
          <p className="mt-4 text-xs text-umber">Payment is manual bKash verification. Your order will remain unpaid until an admin verifies the transaction ID.</p>
          <button disabled={busy || !paymentReady} className="btn-dark mt-5 w-full">{busy ? "Placing order" : !paymentReady ? "Configure bKash first" : "Place order"}</button><p role="alert" className="mt-3 text-sm text-red-800">{err}</p></aside>
      </form>
    </Page>
  );
}
