import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
/** Call at the top of every admin page AND every server action. */
export async function requireAdmin() {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login");
    const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single();
    if (p?.role !== "admin")
        redirect("/");
    return sb;
}
export const str = (fd, k, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
export const cents = (fd, k) => Math.round(Number(str(fd, k) || 0) * 100);
export const uuid = (v) => /^[0-9a-f-]{36}$/i.test(v);
