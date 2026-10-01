import { notFound, redirect } from "next/navigation";
import Page from "@/components/layout/Page";
import AccountNav from "@/components/account/AccountNav";
import { supabaseServer } from "@/lib/supabase/server";
import { uuid } from "@/lib/admin";
import { money } from "@/lib/format";
export const metadata = { title: "Order" };
export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!uuid(id)) notFound();
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) redirect(`/login?next=/account/orders/${id}`);
  const { data: o } = await sb.from("orders").select("*, order_items(name,unit_price_cents,quantity)").eq("id", id).single(); if (!o) notFound();
  const a = o.shipping_address as Record<string, string>;
  return (<Page title={`Order #${o.id.slice(0, 8)}`}><AccountNav /><p className="mb-6 text-sm capitalize text-umber">Status: {o.status} · Payment: {o.payment_status}{o.tracking_number && ` · Tracking: ${o.tracking_number}`}</p>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{o.order_items.map((i: { name: string; unit_price_cents: number; quantity: number }, n: number) => <li key={n} className="flex justify-between py-3"><span>{i.name} × {i.quantity}</span><span>{money((i.unit_price_cents * i.quantity) / 100)}</span></li>)}</ul>
    <dl className="mt-4 max-w-xs space-y-1 text-sm">{[["Subtotal", o.subtotal_cents], ["Discount", -o.discount_cents], ["Shipping", o.shipping_cents], ["Total", o.total_cents]].map(([k, v]) => <div key={k as string} className="flex justify-between"><dt>{k}</dt><dd>{money((v as number) / 100)}</dd></div>)}</dl>
    <p className="mt-6 text-sm text-umber">Ships to {a.first_name} {a.last_name}, {a.line1}, {a.city}, {a.state} {a.postal_code}, {a.country}</p></Page>);
}
