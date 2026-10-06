import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { createPage, deletePage, setPageFlag } from "@/app/admin/pages/actions";
const sm = "border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] hover:bg-cream";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
function Flag({ id, field, value, label }) {
    return (<form action={setPageFlag}>
      <input type="hidden" name="id" value={id}/><input type="hidden" name="field" value={field}/><input type="hidden" name="value" value={String(value)}/>
      <button className={sm}>{label}</button>
    </form>);
}
export default async function AdminPages({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const { data, error } = await sb.from("pages").select("id,title,slug,is_home,published,hidden").order("is_home", { ascending: false }).order("title");
    const rows = (data ?? []);
    return (<>
      <h1 className="mb-2 font-serif text-4xl">Pages</h1>
      <p className="mb-8 max-w-2xl text-sm text-umber">Create pages and build them from sections. <strong>Unpublished</strong> pages are drafts (only visible to you). <strong>Hidden</strong> pages are live at their URL but unlisted: kept out of the sitemap and search engines.</p>
      <Flash ok={sp.ok} error={sp.error}/>
      {error && <p className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Pages could not be loaded. Run the database migration <code>0011_cms.sql</code> in Supabase first.</p>}

      <form action={createPage} className="mb-10 grid max-w-3xl gap-3 border border-sand p-5 sm:grid-cols-[1fr_1fr_auto]">
        <div><label htmlFor="title" className="mb-1 block text-sm">New page title</label><input id="title" name="title" required placeholder="About Us" className={input}/></div>
        <div><label htmlFor="slug" className="mb-1 block text-sm">URL (optional)</label><input id="slug" name="slug" placeholder="about-us" className={input}/></div>
        <button className="btn-dark self-end">Create page</button>
      </form>

      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead><tr className="border-b border-sand text-xs uppercase tracking-[0.12em] text-taupe"><th className="py-2 pr-4">Page</th><th className="pr-4">URL</th><th className="pr-4">Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((p) => (<tr key={p.id} className="border-b border-sand align-top">
            <td className="py-3 pr-4"><Link href={`/admin/pages/${p.id}`} className="underline underline-offset-4">{p.title}</Link>{p.is_home && <span className="ml-2 text-xs text-taupe">Homepage</span>}</td>
            <td className="pr-4 text-umber">{p.is_home ? "/" : `/${p.slug}`}</td>
            <td className="pr-4">{p.published ? "Published" : "Draft"}{p.hidden && " · Hidden"}</td>
            <td><div className="flex flex-wrap gap-2 py-1">
              <Link href={`/admin/pages/${p.id}`} className={sm}>Edit</Link>
              {(p.published || p.is_home) && <a href={p.is_home ? "/" : `/${p.slug}`} target="_blank" rel="noopener noreferrer" className={sm}>View</a>}
              {!p.is_home && <Flag id={p.id} field="published" value={!p.published} label={p.published ? "Unpublish" : "Publish"}/>}
              {!p.is_home && <Flag id={p.id} field="hidden" value={!p.hidden} label={p.hidden ? "Show" : "Hide"}/>}
              {!p.is_home && <form action={deletePage}><input type="hidden" name="id" value={p.id}/><ConfirmButton message={`Delete “${p.title}”? Its sections will be deleted too.`} className={`${sm} text-red-800`}>Delete</ConfirmButton></form>}
            </div></td>
          </tr>))}
          {!rows.length && !error && <tr><td colSpan={4} className="py-6 text-umber">No pages yet.</td></tr>}
        </tbody></table></div>
    </>);
}
