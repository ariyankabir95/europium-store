"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Page from "@/components/layout/Page";
import { useStore } from "@/lib/store";
import AuthGate from "@/components/auth/AuthGate";
import { money } from "@/lib/format";

const fields = [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"], ["line1", "Street address"], ["city", "City / area"], ["state", "District"], ["postalCode", "Postal code"], ["country", "Country"]];
const deliveryZones = [
  { value: "epz_local", label: "Savar EPZ & nearby", description: "Local delivery", fee: 50 },
  { value: "ashulia_bypail", label: "Bypail & Ashulia", description: "Local delivery", fee: 70 },
  { value: "savar_outer", label: "Other selected Savar areas", description: "Savar / Nabinagar nearby", fee: 100 },
];

function CheckoutContents() {
  const { products, cart, clear, currency, openAuth } = useStore();
  const getProduct = (id) => products.find((p) => p.id === id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [config, setConfig] = useState({ bkash_number: "", bkash_instructions: "" });
  const [zone, setZone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const lines = cart.map((l) => ({ ...l, p: getProduct(l.productId) })).filter((l) => l.p);
  const subtotal = lines.reduce((n, l) => n + (l.p.salePrice ?? l.p.price) * l.qty, 0);
  const selectedZone = deliveryZones.find((z) => z.value === zone);
  const shippingFee = selectedZone?.fee ?? 0;

  useEffect(() => {
    fetch("/api/store-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setConfig({ bkash_number: String(j.bkash_number ?? ""), bkash_instructions: String(j.bkash_instructions ?? "") }))
      .catch(() => undefined);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd);
    body.deliveryZone = zone;
    body.paymentMethod = paymentMethod;
    const paymentReference = String(fd.get("paymentReference") ?? "");
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (r.ok) {
        void clear();
        setDone({ id: j.orderId, txid: paymentReference, paymentMethod: j.paymentMethod });
      } else if (r.status === 401) {
        openAuth("Sign in or create an account to place your order.");
      } else {
        setErr(j.error ?? "Something went wrong.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Page title="Order received">
        <div className="max-w-lg space-y-3 text-umber">
          <p>Order #{done.id.slice(0, 8)} has been received.</p>
          {done.paymentMethod === "cod" ? (
            <>
              <p>Payment method: <strong>Cash on Delivery</strong></p>
              <p>We will contact you to confirm your local delivery details. Please pay when your order is delivered.</p>
            </>
          ) : (
            <>
              <p>Payment method: <strong>bKash (manual verification)</strong></p>
              <p>Transaction ID: <strong>{done.txid}</strong></p>
              <p>We will verify the transaction before confirming your order.</p>
            </>
          )}
        </div>
        <Link href="/shop" className="btn-dark mt-6">Continue shopping</Link>
      </Page>
    );
  }

  if (!lines.length) {
    return <Page title="Checkout"><p className="text-umber">Your cart is empty.</p><Link href="/shop" className="btn-dark mt-6">Browse the shop</Link></Page>;
  }

  const paymentReady = Boolean(config.bkash_number.trim());
  return (
    <Page title="Checkout">
      <form onSubmit={submit} className="grid gap-12 md:grid-cols-[1fr_320px]">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([n, l]) => (
            <div key={n} className={n === "line1" || n === "email" ? "sm:col-span-2" : ""}>
              <label htmlFor={n} className="mb-1 block text-sm">{l}</label>
              <input id={n} name={n} type={n === "email" ? "email" : n === "phone" ? "tel" : "text"} required defaultValue={n === "country" ? "Bangladesh" : n === "state" ? "Dhaka" : undefined} className="min-h-11 w-full border border-sand bg-transparent px-3" />
            </div>
          ))}

          <div className="sm:col-span-2 border border-sand p-5">
            <p className="text-xs tracking-[0.18em] uppercase">Local delivery area</p>
            <p className="mt-2 text-sm text-taupe">EUROPIUM currently delivers in selected areas of Savar only. Select your area to see the delivery charge.</p>
            <div className="mt-4 space-y-3">
              {deliveryZones.map((z) => (
                <label key={z.value} className="flex cursor-pointer items-start gap-3 border border-sand p-3">
                  <input type="radio" name="deliveryZoneChoice" value={z.value} required checked={zone === z.value} onChange={() => setZone(z.value)} className="mt-1" />
                  <span className="flex-1 text-sm"><strong>{z.label}</strong><span className="mt-1 block text-taupe">{z.description}</span></span>
                  <strong>{money(z.fee, currency)}</strong>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2"><label htmlFor="coupon" className="mb-1 block text-sm">Coupon (optional)</label><input id="coupon" name="coupon" className="min-h-11 w-full border border-sand bg-transparent px-3" /></div>

          <div className="sm:col-span-2 border border-sand p-5">
            <p className="text-xs tracking-[0.18em] uppercase">Payment method</p>
            <div className="mt-4 space-y-4">
              <label className="flex items-start gap-3 text-sm">
                <input type="radio" name="paymentChoice" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mt-1" />
                <span><strong>Cash on Delivery (COD)</strong><span className="block text-taupe">Pay the product amount in cash when your order is delivered.</span></span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="radio" name="paymentChoice" value="bkash_manual" checked={paymentMethod === "bkash_manual"} onChange={() => setPaymentMethod("bkash_manual")} className="mt-1" />
                <span><strong>Prepayment — bKash</strong><span className="block text-taupe">{paymentReady ? "Pay before delivery to " + config.bkash_number + ". Your order is confirmed after payment verification." : "Prepayment is unavailable until the store configures its bKash number."}</span></span>
              </label>
            </div>
            {paymentMethod === "cod" && <div className="mt-5 border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Important: delivery charge must be paid in advance.</strong><p className="mt-1">COD applies to the product amount only. Please pay the delivery charge before dispatch using the store-confirmed payment instructions. We will confirm the delivery-charge payment process with you before shipping.</p></div>}
            {paymentMethod === "bkash_manual" && paymentReady && (
              <>
                <p className="mt-4 whitespace-pre-line text-sm text-umber">{config.bkash_instructions}</p>
                <label htmlFor="paymentReference" className="mt-4 mb-1 block text-sm">bKash transaction ID</label>
                <input id="paymentReference" name="paymentReference" required minLength={4} maxLength={80} className="min-h-11 w-full border border-sand bg-transparent px-3" placeholder="Enter your TrxID" />
              </>
            )}
            {paymentMethod === "bkash_manual" && !paymentReady && <p className="mt-3 text-sm text-red-800">bKash is not configured yet. Choose COD or contact the store.</p>}
          </div>
        </div>

        <aside className="h-fit border border-sand p-6 text-sm">
          <h2 className="mb-4 text-xs tracking-[0.18em] uppercase">Order summary</h2>
          <ul className="space-y-2">{lines.map((l) => <li key={l.productId + l.size + l.color} className="flex justify-between gap-3"><span>{l.p.name} × {l.qty}</span><span>{money((l.p.salePrice ?? l.p.price) * l.qty, currency)}</span></li>)}</ul>
          <p className="mt-4 flex justify-between border-t border-sand pt-3"><span>Subtotal</span><span>{money(subtotal, currency)}</span></p>
          <p className="mt-2 flex justify-between"><span>Delivery{selectedZone ? " · " + selectedZone.label : ""}</span><span>{selectedZone ? money(shippingFee, currency) : "Select area"}</span></p>
          <p className="mt-3 flex justify-between border-t border-sand pt-3 font-medium"><span>Estimated total before coupon</span><span>{selectedZone ? money(subtotal + shippingFee, currency) : "—"}</span></p>
          <p className="mt-3 text-xs text-taupe">Delivery is currently available only in the selected Savar-area zones. For COD, the delivery charge must be paid in advance; the product amount is paid on delivery. Final total and any coupon discount are calculated securely on the server.</p>
          {currency !== "BDT" && <p className="mt-4 text-xs text-umber">Prices are shown in {currency} for reference. All payments and delivery charges are calculated in BDT.</p>}
          {paymentMethod === "bkash_manual" && <p className="mt-4 text-xs text-umber">Your order remains unpaid until an admin verifies the bKash transaction ID.</p>}
          <button disabled={busy || !zone || (paymentMethod === "bkash_manual" && !paymentReady)} className="btn-dark mt-5 w-full">{busy ? "Placing order" : "Place order"}</button>
          <p role="alert" className="mt-3 text-sm text-red-800">{err}</p>
        </aside>
      </form>
    </Page>
  );
}

export default function Checkout() {
  return <AuthGate title="Checkout" message="Sign in or create an account to check out."><CheckoutContents /></AuthGate>;
}
