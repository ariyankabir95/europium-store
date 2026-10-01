import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
export const metadata = { title: "Admin", robots: { index: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) redirect("/login?next=/admin");
  const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single(); if (p?.role !== "admin") redirect("/");
  return (<div className="grid min-h-screen md:grid-cols-[220px_1fr]"><aside className="border-r border-sand bg-cream p-6"><p className="mb-8 font-serif text-xl tracking-[0.25em]">EUROPIUM</p><nav aria-label="Admin" className="space-y-3 text-sm">{[["Dashboard","/admin"],["Products","/admin/products"],["Media","/admin/media"],["Homepage","/admin/homepage"],["Lookbook","/admin/lookbook"],["Settings","/admin/settings"],["Categories","/admin/categories"],["Collections","/admin/collections"],["Customers","/admin/customers"],["Inventory","/admin/inventory"],["Orders","/admin/orders"],["Coupons","/admin/coupons"],["Reviews","/admin/reviews"],["Messages","/admin/messages"],["Newsletter","/admin/newsletter"]].map(([l,h])=><Link key={h} href={h} className="block hover:underline">{l}</Link>)}</nav></aside><main className="p-6 md:p-10">{children}</main></div>);
}
