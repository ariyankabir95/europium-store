import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
export default async function Dashboard() {
  const sb = await supabaseServer();
  const count = async (t: string) => (await sb.from(t).select("*", { count: "exact", head: true })).count ?? 0;
  const [orders, products, customers, messages] = await Promise.all([count("orders"), count("products"), count("profiles"), count("contact_messages")]);
  return (<><h1 className="mb-8 font-serif text-4xl">Dashboard</h1><dl className="grid grid-cols-2 gap-4 md:grid-cols-4">{[["Orders", orders, "/admin/orders"], ["Products", products, "/admin/products"], ["Customers", customers, "/admin/customers"], ["Messages", messages, "/admin/messages"]].map(([k, v, href]) => <Link key={k} href={href as string} className="block border border-sand p-5"><dt className="text-xs tracking-[0.18em] uppercase">{k}</dt><dd className="mt-2 font-serif text-3xl">{v}</dd></Link>)}</dl></>);
}
