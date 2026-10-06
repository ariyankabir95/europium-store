import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Page from "@/components/layout/Page";
import AccountNav from "@/components/account/AccountNav";
import { supabaseServer } from "@/lib/supabase/server";
import { str } from "@/lib/admin";
export const metadata = { title: "Profile" };
async function save(fd) {
    "use server";
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login");
    await sb.from("profiles").update({ full_name: str(fd, "full_name", 120), phone: str(fd, "phone", 30) }).eq("id", user.id);
    revalidatePath("/account/profile");
}
export default async function Profile() {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/profile");
    const { data: p } = await sb.from("profiles").select("full_name,phone").eq("id", user.id).single();
    const i = "min-h-11 w-full border border-sand bg-transparent px-3";
    return (<Page title="Profile"><AccountNav /><form action={save} className="max-w-sm space-y-5"><div><label htmlFor="e" className="mb-1 block text-sm">Email</label><input id="e" value={user.email ?? ""} disabled className={`${i} opacity-60`}/></div><div><label htmlFor="full_name" className="mb-1 block text-sm">Full name</label><input id="full_name" name="full_name" defaultValue={p?.full_name ?? ""} className={i}/></div><div><label htmlFor="phone" className="mb-1 block text-sm">Phone</label><input id="phone" name="phone" type="tel" defaultValue={p?.phone ?? ""} className={i}/></div><button className="btn-dark">Save changes</button></form></Page>);
}
