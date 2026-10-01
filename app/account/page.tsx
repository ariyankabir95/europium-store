import { redirect } from "next/navigation";
import Link from "next/link";
import AccountNav from "@/components/account/AccountNav";
import Page from "@/components/layout/Page";
import { supabaseServer } from "@/lib/supabase/server";
import { money } from "@/lib/format";
export const metadata = { title: "Account" };
export default async function Account() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) redirect("/login?next=/account");
  const [{ data: profile }, { data: orders }] = await Promise.all([sb.from("profiles").select("full_name").eq("id", user.id).single(), sb.from("orders").select("id,status,total_cents,created_at").order("created_at", { ascending: false }).limit(20)]);
  return (
    <Page title="Your account" intro={`Signed in as ${profile?.full_name || user.email}.`}>
      <AccountNav /><h2 className="mb-4 font-serif text-2xl">Orders</h2>
      {orders?.length ? <ul className="divide-y divide-sand border-y border-sand text-sm">{orders.map((o) => <li key={o.id} className="flex justify-between py-4"><Link href={`/account/orders/${o.id}`} className="underline">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("en-US")}</Link><span className="capitalize">{o.status} · {money(o.total_cents / 100)}</span></li>)}</ul> : <p className="text-umber">No orders yet.</p>}
      <form action="/auth/signout" method="post" className="mt-10"><button className="btn-line">Sign out</button></form>
    </Page>
  );
}
