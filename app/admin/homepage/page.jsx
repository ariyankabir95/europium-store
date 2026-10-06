import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
// The homepage is now a CMS page. This keeps the old /admin/homepage link working by opening the home page editor.
export default async function Homepage() {
    const sb = await requireAdmin();
    const { data } = await sb.from("pages").select("id").eq("is_home", true).maybeSingle();
    if (data?.id)
        redirect(`/admin/pages/${data.id}`);
    redirect("/admin/pages?error=" + encodeURIComponent("Homepage CMS not set up yet: run migration 0011_cms.sql in Supabase."));
}
