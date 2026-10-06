import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, uuid } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import SectionFields from "@/components/admin/SectionFields";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { loadLookups } from "@/lib/cms-admin";
import { SECTION_DEFS, getSectionDef } from "@/lib/cms-schema";
import { addSection, deleteSection, moveSection, saveSection, toggleSection, updatePage } from "@/app/admin/pages/actions";
const sm = "border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] hover:bg-cream disabled:opacity-40";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
function Mini({ action, id, pageId, name, value, label, disabled }) {
    return (<form action={action}>
      <input type="hidden" name="id" value={id}/><input type="hidden" name="page_id" value={pageId}/><input type="hidden" name={name} value={value}/>
      <button disabled={disabled} className={sm}>{label}</button>
    </form>);
}
function DeleteSection({ id, pageId }) {
    return (<form action={deleteSection}>
      <input type="hidden" name="id" value={id}/><input type="hidden" name="page_id" value={pageId}/>
      <ConfirmButton message="Delete this section? This cannot be undone." className={`${sm} text-red-800`}>Delete</ConfirmButton>
    </form>);
}
export default async function EditPage({ params, searchParams }) {
    const sb = await requireAdmin();
    const [{ id }, sp] = await Promise.all([params, searchParams]);
    if (!uuid(id))
        notFound();
    const { data: page } = await sb.from("pages").select("id,title,slug,is_home,published,hidden,seo_title,seo_description,canonical_url").eq("id", id).maybeSingle();
    if (!page)
        notFound();
    const [{ data: secData }, lookups] = await Promise.all([
        sb.from("page_sections").select("id,type,sort,active,content").eq("page_id", id).order("sort", { ascending: true }).order("created_at", { ascending: true }),
        loadLookups(sb),
    ]);
    const sections = (secData ?? []);
    const url = page.is_home ? "/" : `/${page.slug}`;
    return (<>
      <p className="mb-2 text-sm"><Link href="/admin/pages" className="underline underline-offset-4">← All pages</Link></p>
      <h1 className="mb-2 font-serif text-4xl">{page.title}</h1>
      <p className="mb-6 text-sm text-umber">{url} · {page.is_home ? "Homepage" : page.published ? (page.hidden ? "Published (hidden)" : "Published") : "Draft"} · <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{page.published || page.is_home ? "View page" : "Preview draft"}</a></p>
      <Flash ok={sp.ok} error={sp.error}/>

      <form action={updatePage} className="mb-12 grid max-w-3xl gap-4 border border-sand p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={id}/>
        <h2 className="font-serif text-2xl sm:col-span-2">Page settings</h2>
        <div><label htmlFor="title" className="mb-1 block text-sm">Title</label><input id="title" name="title" defaultValue={page.title} required className={input}/></div>
        <div><label htmlFor="slug" className="mb-1 block text-sm">URL slug</label><input id="slug" name="slug" defaultValue={page.slug} readOnly={!!page.is_home} className={input}/>{page.is_home ? <p className="mt-1 text-xs text-taupe">The homepage always lives at /.</p> : <p className="mt-1 text-xs text-taupe">Page address: /{page.slug}. Menu links follow slug changes automatically.</p>}</div>
        <div className="sm:col-span-2"><label htmlFor="seo_title" className="mb-1 block text-sm">SEO title</label><input id="seo_title" name="seo_title" defaultValue={page.seo_title ?? ""} maxLength={160} className={input}/></div>
        <div className="sm:col-span-2"><label htmlFor="seo_description" className="mb-1 block text-sm">SEO description</label><textarea id="seo_description" name="seo_description" defaultValue={page.seo_description ?? ""} rows={2} maxLength={320} className="w-full border border-sand bg-transparent px-3 py-2"/></div>
        <div className="sm:col-span-2"><label htmlFor="canonical_url" className="mb-1 block text-sm">Canonical URL (optional)</label><input id="canonical_url" name="canonical_url" defaultValue={page.canonical_url ?? ""} placeholder="https://yourstore.com/about-us" className={input}/><p className="mt-1 text-xs text-taupe">Leave empty to use the page’s own address.</p></div>
        {!page.is_home && <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={!!page.published} className="h-5 w-5"/>Published (unchecked = draft, not public)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hidden" defaultChecked={!!page.hidden} className="h-5 w-5"/>Hidden (live but unlisted, not in search/sitemap)</label>
        </>}
        <button className="btn-dark sm:col-span-2 sm:justify-self-start">Save page settings</button>
      </form>

      <h2 className="mb-4 font-serif text-3xl">Sections</h2>
      <p className="mb-6 max-w-2xl text-sm text-umber">Sections show on the page from top to bottom. Use the arrows to reorder, Hide to take a section off the page without deleting it.</p>
      {page.is_home && sections.length === 0 && <p className="mb-6 border border-sand px-4 py-3 text-sm text-umber">No sections yet: the storefront is showing the built-in homepage. Run migration <code>0011_cms.sql</code> to import it as sections, or add sections here.</p>}

      <div className="space-y-4">
        {sections.map((s, i) => {
            const def = getSectionDef(s.type);
            if (!def)
                return null;
            const heading = String(s.content.title ?? "").replace(/\n/g, " ").slice(0, 60);
            return (<details key={s.id} id={`s-${s.id}`} className={`border border-sand ${s.active ? "" : "opacity-60"}`}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4">
                <span><span className="mr-3 text-xs text-taupe">{i + 1}</span><strong>{def.label}</strong>{heading && <span className="ml-3 text-umber">{heading}</span>}{!s.active && <span className="ml-3 text-xs uppercase tracking-[0.12em] text-taupe">Hidden</span>}</span>
              </summary>
              <div className="border-t border-sand p-4">
                <div className="mb-5 flex flex-wrap gap-2">
                  <Mini action={moveSection} id={s.id} pageId={id} name="dir" value="up" label="↑ Up" disabled={i === 0}/>
                  <Mini action={moveSection} id={s.id} pageId={id} name="dir" value="down" label="↓ Down" disabled={i === sections.length - 1}/>
                  <Mini action={toggleSection} id={s.id} pageId={id} name="value" value={String(!s.active)} label={s.active ? "Hide" : "Show"}/>
                  <DeleteSection id={s.id} pageId={id}/>
                </div>
                <form action={saveSection} className="space-y-4">
                  <input type="hidden" name="id" value={s.id}/>
                  <p className="text-xs text-taupe">{def.description}</p>
                  <SectionFields def={def} content={s.content} lookups={lookups} uid={`sec-${s.id}`}/>
                  <button className="btn-dark">Save section</button>
                </form>
              </div>
            </details>);
        })}
        {!sections.length && <p className="text-sm text-umber">This page has no sections yet.</p>}
      </div>

      <form action={addSection} className="mt-8 flex max-w-xl flex-wrap items-end gap-3 border border-sand p-5">
        <input type="hidden" name="page_id" value={id}/>
        <div className="min-w-[220px] flex-1"><label htmlFor="type" className="mb-1 block text-sm">Add a section</label>
          <select id="type" name="type" className={input}>{SECTION_DEFS.map((d) => <option key={d.type} value={d.type}>{d.label} — {d.description}</option>)}</select></div>
        <button className="btn-dark">Add section</button>
      </form>
    </>);
}
