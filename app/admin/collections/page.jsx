import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ImageField from "@/components/admin/ImageField";
import SubmitButton from "@/components/admin/SubmitButton";
import { createCollection, deleteCollection, saveCollection } from "@/app/admin/collections/actions";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
export default async function Collections({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const { data } = await sb.from("collections").select("*").order("sort");
    return (<>
      <h1 className="mb-6 font-serif text-4xl">Collections</h1>
      <Flash ok={sp.ok} error={sp.error}/>

      <form action={createCollection} className="mb-10 grid max-w-3xl gap-4 border border-sand p-5 sm:grid-cols-2">
        <h2 className="text-xs tracking-[0.18em] uppercase sm:col-span-2">New collection</h2>
        <div><label htmlFor="new-title" className="mb-1 block text-sm">Title</label><input id="new-title" name="title" required className={input}/></div>
        <div><label htmlFor="new-slug" className="mb-1 block text-sm">Slug</label><input id="new-slug" name="slug" required placeholder="slug-like-this" className={input}/></div>
        <div className="sm:col-span-2"><label htmlFor="new-desc" className="mb-1 block text-sm">Description</label><input id="new-desc" name="description" className={input}/></div>
        <div><label htmlFor="new-sort" className="mb-1 block text-sm">Order</label><input id="new-sort" name="sort" type="number" className={input}/></div>
        <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="published" defaultChecked className="h-5 w-5"/>Visible</label>
        <div className="sm:col-span-2"><ImageField name="image" label="Collection image"/></div>
        <div className="sm:col-span-2"><SubmitButton pending="Creating…">Add collection</SubmitButton></div>
      </form>

      <ul className="divide-y divide-sand border-y border-sand text-sm">
        {data?.map((c) => (<li key={c.id} className="py-6">
            <form action={saveCollection} className="grid max-w-3xl gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id}/>
              <p className="text-xs text-taupe sm:col-span-2">/collection/{c.slug}</p>
              <div><label htmlFor={`t-${c.id}`} className="mb-1 block text-sm">Title</label><input id={`t-${c.id}`} name="title" defaultValue={c.title} required className={input}/></div>
              <div><label htmlFor={`o-${c.id}`} className="mb-1 block text-sm">Order</label><input id={`o-${c.id}`} name="sort" type="number" defaultValue={c.sort} className={input}/></div>
              <div className="sm:col-span-2"><label htmlFor={`d-${c.id}`} className="mb-1 block text-sm">Description</label><input id={`d-${c.id}`} name="description" defaultValue={c.description ?? ""} className={input}/></div>
              <div className="sm:col-span-2"><ImageField name="image" label="Collection image" currentUrl={c.image_url} alt={c.title} removeName="remove_image"/></div>
              <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={c.published} className="h-5 w-5"/>Visible</label>
              <div className="flex items-center gap-4 sm:col-span-2"><SubmitButton className="btn-dark min-h-11 px-6">Save</SubmitButton><Link href={`/admin/collections/${c.id}`} className="underline">Assign products</Link></div>
            </form>
            <form action={deleteCollection} className="mt-2"><input type="hidden" name="id" value={c.id}/><ConfirmButton message={`Delete collection “${c.title}”? Its image file is only removed if no other item uses it.`} className="min-h-11 text-xs underline">Delete collection</ConfirmButton></form>
          </li>))}
      </ul>
    </>);
}
