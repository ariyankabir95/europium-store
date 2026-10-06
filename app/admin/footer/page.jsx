import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import LinkFields from "@/components/admin/LinkFields";
import { ensureMenu, loadLookups } from "@/lib/cms-admin";
import { addColumn, addLink, deleteColumn, deleteLink, moveColumn, moveLink, saveColumn, saveFooterSettings, saveLink } from "@/app/admin/footer/actions";
const sm = "border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] hover:bg-cream disabled:opacity-40";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
function Mini({ action, id, dir, label, disabled }) {
    return <form action={action}><input type="hidden" name="id" value={id}/><input type="hidden" name="dir" value={dir}/><button disabled={disabled} className={sm}>{label}</button></form>;
}
export default async function AdminFooter({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const [menu, lookups, cols, links] = await Promise.all([
        ensureMenu(sb, "footer", "Footer settings", {}),
        loadLookups(sb),
        sb.from("footer_columns").select("id,title,placement,active").order("sort", { ascending: true }).order("created_at", { ascending: true }),
        sb.from("footer_links").select("id,column_id,label,link_type,link_target,open_new_tab,active").order("sort", { ascending: true }).order("created_at", { ascending: true }),
    ]);
    const columns = (cols.data ?? []);
    const all = (links.data ?? []);
    const s = (menu?.settings ?? {});
    return (<>
      <h1 className="mb-2 font-serif text-4xl">Footer</h1>
      <p className="mb-8 max-w-2xl text-sm text-umber">Columns and links shown at the bottom of every page. A column with no visible links is not shown. The <strong>bottom row</strong> placement is for small inline links like Privacy and Terms.</p>
      <Flash ok={sp.ok} error={sp.error}/>
      {cols.error && <p className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Footer tables not found. Run migration <code>0011_cms.sql</code> in Supabase first.</p>}

      <form action={saveFooterSettings} className="mb-10 grid max-w-3xl gap-3 border border-sand p-5">
        <h2 className="font-serif text-2xl">Footer text</h2>
        <div><label htmlFor="about_text" className="mb-1 block text-sm">Brand description</label><textarea id="about_text" name="about_text" defaultValue={s.about_text ?? ""} rows={2} maxLength={300} className="w-full border border-sand bg-transparent px-3 py-2"/></div>
        <div><label htmlFor="copyright_text" className="mb-1 block text-sm">Copyright line (leave empty for the default)</label><input id="copyright_text" name="copyright_text" defaultValue={s.copyright_text ?? ""} maxLength={200} className={input}/></div>
        <button className="btn-dark justify-self-start">Save footer text</button>
      </form>

      <div className="space-y-8">
        {columns.map((col, ci) => {
            const ls = all.filter((l) => l.column_id === col.id);
            return (<section key={col.id} className={`border border-sand p-5 ${col.active ? "" : "opacity-60"}`}>
              <form action={saveColumn} className="mb-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={col.id}/>
                <div className="min-w-[200px]"><label htmlFor={`t-${col.id}`} className="mb-1 block text-sm">Column name</label><input id={`t-${col.id}`} name="title" defaultValue={col.title} required maxLength={60} className={input}/></div>
                <div><label htmlFor={`p-${col.id}`} className="mb-1 block text-sm">Placement</label><select id={`p-${col.id}`} name="placement" defaultValue={col.placement} className={input}><option value="main">Footer column</option><option value="bottom">Bottom row</option></select></div>
                <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={col.active} className="h-5 w-5"/>Visible</label>
                <button className="btn-dark min-h-11 px-5">Save column</button>
              </form>
              <div className="mb-5 flex flex-wrap gap-2">
                <Mini action={moveColumn} id={col.id} dir="up" label="← Up" disabled={ci === 0}/>
                <Mini action={moveColumn} id={col.id} dir="down" label="Down →" disabled={ci === columns.length - 1}/>
                <form action={deleteColumn}><input type="hidden" name="id" value={col.id}/><ConfirmButton message={`Delete the “${col.title}” column and all its links?`} className={`${sm} text-red-800`}>Delete column</ConfirmButton></form>
              </div>

              <div className="space-y-3">
                {ls.map((l, li) => (<div key={l.id} className={`border border-sand p-3 ${l.active ? "" : "opacity-60"}`}>
                    <form action={saveLink} className="grid gap-3 md:grid-cols-[200px_1fr]">
                      <input type="hidden" name="id" value={l.id}/>
                      <div><label htmlFor={`ll-${l.id}`} className="mb-1 block text-sm">Label</label><input id={`ll-${l.id}`} name="label" defaultValue={l.label} required maxLength={60} className={input}/></div>
                      <LinkFields name="link" label="Link" type={l.link_type} target={l.link_target} options={lookups}/>
                      <div className="flex flex-wrap items-center gap-5 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={l.active} className="h-5 w-5"/>Visible</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="open_new_tab" defaultChecked={l.open_new_tab} className="h-5 w-5"/>New tab</label>
                        <button className="btn-dark min-h-10 px-5">Save link</button>
                      </div>
                    </form>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-sand pt-3">
                      <Mini action={moveLink} id={l.id} dir="up" label="↑ Up" disabled={li === 0}/>
                      <Mini action={moveLink} id={l.id} dir="down" label="↓ Down" disabled={li === ls.length - 1}/>
                      <form action={deleteLink}><input type="hidden" name="id" value={l.id}/><ConfirmButton message={`Delete the “${l.label}” link?`} className={`${sm} text-red-800`}>Delete</ConfirmButton></form>
                    </div>
                  </div>))}
                {!ls.length && <p className="text-sm text-umber">No links in this column.</p>}
              </div>

              <form action={addLink} className="mt-4 grid gap-3 border-t border-sand pt-4 md:grid-cols-[200px_1fr]">
                <input type="hidden" name="column_id" value={col.id}/><input type="hidden" name="active" value="on"/>
                <div><label htmlFor={`nl-${col.id}`} className="mb-1 block text-sm">New link label</label><input id={`nl-${col.id}`} name="label" required maxLength={60} className={input}/></div>
                <LinkFields name="link" label="Link" options={lookups}/>
                <button className="btn-dark md:col-span-2 md:justify-self-start">Add link</button>
              </form>
            </section>);
        })}
        {!columns.length && !cols.error && <p className="text-sm text-umber">No columns yet. The store is showing its built-in fallback footer until you add one.</p>}
      </div>

      {!cols.error && (<form action={addColumn} className="mt-8 flex max-w-2xl flex-wrap items-end gap-3 border border-sand p-5">
          <div className="min-w-[200px] flex-1"><label htmlFor="new-col" className="mb-1 block text-sm">Add column</label><input id="new-col" name="title" required maxLength={60} placeholder="Company" className={input}/></div>
          <div><label htmlFor="new-pl" className="mb-1 block text-sm">Placement</label><select id="new-pl" name="placement" className={input}><option value="main">Footer column</option><option value="bottom">Bottom row</option></select></div>
          <button className="btn-dark">Add column</button>
        </form>)}
    </>);
}
