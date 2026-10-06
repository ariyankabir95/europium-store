import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import LinkFields from "@/components/admin/LinkFields";
import { ensureMenu, loadLookups } from "@/lib/cms-admin";
import { getBlocks } from "@/lib/cms";
import { addNavItem, deleteNavItem, moveNavItem, saveAnnouncement, saveHeaderSettings, saveNavItem } from "@/app/admin/navigation/actions";
const sm = "border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] hover:bg-cream disabled:opacity-40";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
function Mini({ action, id, dir, label, disabled }) {
    return <form action={action}><input type="hidden" name="id" value={id}/><input type="hidden" name="dir" value={dir}/><button disabled={disabled} className={sm}>{label}</button></form>;
}
export default async function AdminNavigation({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const [menu, lookups, blocks] = await Promise.all([ensureMenu(sb, "header", "Header & mobile menu", { logo_text: "EUROPIUM" }), loadLookups(sb), getBlocks()]);
    const { data } = menu ? await sb.from("navigation_items").select("id,label,link_type,link_target,open_new_tab,active").eq("menu_id", menu.id).order("sort", { ascending: true }).order("created_at", { ascending: true }) : { data: null };
    const items = (data ?? []);
    const logo = String(menu?.settings.logo_text ?? "EUROPIUM");
    const ann = blocks.announcement;
    return (<>
      <h1 className="mb-2 font-serif text-4xl">Navigation</h1>
      <p className="mb-8 max-w-2xl text-sm text-umber">These items build the desktop header <strong>and</strong> the mobile menu. If this list is empty or unavailable, the store falls back to a built-in menu.</p>
      <Flash ok={sp.ok} error={sp.error}/>
      {!menu && <p className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Navigation tables not found. Run migration <code>0011_cms.sql</code> in Supabase first.</p>}

      <div className="mb-10 grid max-w-3xl gap-6 md:grid-cols-2">
        <form action={saveHeaderSettings} className="space-y-3 border border-sand p-5">
          <h2 className="font-serif text-2xl">Header</h2>
          <div><label htmlFor="logo_text" className="mb-1 block text-sm">Logo text</label><input id="logo_text" name="logo_text" defaultValue={logo} maxLength={40} className={input}/></div>
          <button className="btn-dark">Save header</button>
        </form>
        <form action={saveAnnouncement} className="space-y-3 border border-sand p-5">
          <h2 className="font-serif text-2xl">Announcement bar</h2>
          <div><label htmlFor="title" className="mb-1 block text-sm">Text (shown above the header on the homepage)</label><input id="title" name="title" defaultValue={ann.title} maxLength={200} className={input}/></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={ann.published} className="h-5 w-5"/>Visible</label>
          <button className="btn-dark">Save announcement</button>
        </form>
      </div>

      <h2 className="mb-4 font-serif text-3xl">Menu items</h2>
      <div className="space-y-4">
        {items.map((it, i) => (<div key={it.id} className={`border border-sand p-4 ${it.active ? "" : "opacity-60"}`}>
            <form action={saveNavItem} className="grid gap-3 md:grid-cols-[200px_1fr]">
              <input type="hidden" name="id" value={it.id}/>
              <div><label htmlFor={`l-${it.id}`} className="mb-1 block text-sm">Label</label><input id={`l-${it.id}`} name="label" defaultValue={it.label} required maxLength={60} className={input}/></div>
              <LinkFields name="link" label="Link" type={it.link_type} target={it.link_target} options={lookups}/>
              <div className="flex flex-wrap items-center gap-5 md:col-span-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={it.active} className="h-5 w-5"/>Visible</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="open_new_tab" defaultChecked={it.open_new_tab} className="h-5 w-5"/>Open in new tab</label>
                <button className="btn-dark min-h-10 px-5">Save</button>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-sand pt-3">
              <Mini action={moveNavItem} id={it.id} dir="up" label="↑ Up" disabled={i === 0}/>
              <Mini action={moveNavItem} id={it.id} dir="down" label="↓ Down" disabled={i === items.length - 1}/>
              <form action={deleteNavItem}><input type="hidden" name="id" value={it.id}/><ConfirmButton message={`Delete the “${it.label}” menu item?`} className={`${sm} text-red-800`}>Delete</ConfirmButton></form>
            </div>
          </div>))}
        {!items.length && menu && <p className="text-sm text-umber">No menu items. The store is showing its built-in fallback menu until you add one.</p>}
      </div>

      {menu && (<form action={addNavItem} className="mt-8 grid max-w-3xl gap-3 border border-sand p-5 md:grid-cols-[200px_1fr]">
          <h3 className="font-serif text-2xl md:col-span-2">Add menu item</h3>
          <div><label htmlFor="new-label" className="mb-1 block text-sm">Label</label><input id="new-label" name="label" required maxLength={60} placeholder="New Arrivals" className={input}/></div>
          <LinkFields name="link" label="Link" options={lookups}/>
          <input type="hidden" name="active" value="on"/>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="open_new_tab" className="h-5 w-5"/>Open in new tab</label>
          <button className="btn-dark md:col-span-2 md:justify-self-start">Add menu item</button>
        </form>)}
    </>);
}
