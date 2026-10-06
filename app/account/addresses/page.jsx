import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Page from "@/components/layout/Page";
import AccountNav from "@/components/account/AccountNav";
import { supabaseServer } from "@/lib/supabase/server";
import { str, uuid } from "@/lib/admin";
export const metadata = { title: "Addresses" };
const F = [["first_name", "First name"], ["last_name", "Last name"], ["line1", "Address"], ["city", "City"], ["state", "State"], ["postal_code", "Postal code"], ["country", "Country"], ["phone", "Phone"]];
async function act(fd) {
    "use server";
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login");
    if (str(fd, "op") === "delete") {
        const id = str(fd, "address_id");
        if (uuid(id))
            await sb.from("addresses").delete().eq("id", id).eq("user_id", user.id);
    }
    else {
        const row = Object.fromEntries(F.map(([k]) => [k, str(fd, k, 200)]));
        if (row.line1 && row.city && row.country)
            await sb.from("addresses").insert({ ...row, user_id: user.id });
    }
    revalidatePath("/account/addresses");
}
export default async function Addresses() {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/addresses");
    const { data } = await sb.from("addresses").select("*").eq("user_id", user.id);
    return (<Page title="Addresses"><AccountNav />{data?.length ? <ul className="mb-10 divide-y divide-sand border-y border-sand text-sm">{data.map((a) => <li key={a.id} className="flex justify-between py-3"><span>{a.first_name} {a.last_name}, {a.line1}, {a.city} {a.postal_code}, {a.country}</span><form action={act}><input type="hidden" name="address_id" value={a.id}/><button name="op" value="delete" className="min-h-11 underline">Remove</button></form></li>)}</ul> : <p className="mb-10 text-umber">No saved addresses.</p>}
    <h2 className="mb-4 font-serif text-2xl">Add an address</h2><form action={act} className="grid max-w-xl gap-4 sm:grid-cols-2">{F.map(([k, l]) => <div key={k} className={k === "line1" ? "sm:col-span-2" : ""}><label htmlFor={k} className="mb-1 block text-sm">{l}</label><input id={k} name={k} required={["line1", "city", "country"].includes(k)} className="min-h-11 w-full border border-sand bg-transparent px-3"/></div>)}<div className="sm:col-span-2"><button name="op" value="add" className="btn-dark">Save address</button></div></form></Page>);
}
