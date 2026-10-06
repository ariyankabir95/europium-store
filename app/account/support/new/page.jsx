import { redirect } from "next/navigation";
import Link from "next/link";
import Page from "@/components/layout/Page";
import AccountNav from "@/components/account/AccountNav";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import { supabaseServer } from "@/lib/supabase/server";
import { createSupportTicket } from "../actions";
import { formatWhen } from "@/lib/support";
export const metadata = { title: "New support request" };
export default async function NewSupportRequest({ searchParams }) {
    const sp = await searchParams;
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/support/new");
    // Only the signed-in customer's own orders are offered. Row-level security enforces this too.
    const { data: orders } = await sb.from("orders").select("id,created_at,status").order("created_at", { ascending: false }).limit(50);
    const input = "min-h-11 w-full border border-sand bg-transparent px-3";
    return (<Page title="New request" intro="Tell us what you need. If your question is about an order, select it so our team has the details.">
      <AccountNav />
      <p className="mb-6 text-sm"><Link href="/account/support" className="underline underline-offset-4">← All requests</Link></p>
      <Flash error={sp.error}/>
      <form action={createSupportTicket} className="grid max-w-xl gap-5">
        <div>
          <label htmlFor="subject" className="mb-1 block text-sm">Subject</label>
          <input id="subject" name="subject" required maxLength={200} className={input} placeholder="For example: Size exchange for my order"/>
        </div>
        <div>
          <label htmlFor="order_id" className="mb-1 block text-sm">Related order <span className="text-taupe">(optional)</span></label>
          <select id="order_id" name="order_id" defaultValue="" className={input}>
            <option value="">Not about a specific order</option>
            {(orders ?? []).map((o) => (<option key={o.id} value={o.id}>#{o.id.slice(0, 8)} · {formatWhen(o.created_at)} · {o.status}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="body" className="mb-1 block text-sm">Message</label>
          <textarea id="body" name="body" required rows={7} maxLength={5000} className="w-full border border-sand bg-transparent p-3"/>
        </div>
        <div><SubmitButton pending="Sending…">Send request</SubmitButton></div>
      </form>
    </Page>);
}
