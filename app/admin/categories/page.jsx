import { requireAdmin } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ImageField from "@/components/admin/ImageField";
import SubmitButton from "@/components/admin/SubmitButton";
import { createCategory, deleteCategory, saveCategory } from "@/app/admin/categories/actions";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
export default async function Categories({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const { data } = await sb.from("categories").select("*").order("sort").order("name");
    return (<>
      <h1 className="mb-6 font-serif text-4xl">Categories</h1>
      <Flash ok={sp.ok} error={sp.error}/>

      <form action={createCategory} className="mb-10 grid max-w-3xl gap-4 border border-sand p-5 sm:grid-cols-2">
        <h2 className="text-xs tracking-[0.18em] uppercase sm:col-span-2">New category</h2>
        <div><label htmlFor="new-name" className="mb-1 block text-sm">Name</label><input id="new-name" name="name" required className={input}/></div>
        <div><label htmlFor="new-slug" className="mb-1 block text-sm">Slug</label><input id="new-slug" name="slug" required placeholder="slug-like-this" className={input}/></div>
        <div className="sm:col-span-2"><label htmlFor="new-desc" className="mb-1 block text-sm">Description</label><input id="new-desc" name="description" className={input}/></div>
        <div><label htmlFor="new-seot" className="mb-1 block text-sm">SEO title</label><input id="new-seot" name="seo_title" className={input}/></div>
        <div><label htmlFor="new-seod" className="mb-1 block text-sm">SEO description</label><input id="new-seod" name="seo_description" className={input}/></div>
        <div className="sm:col-span-2"><ImageField name="image" label="Category image"/></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked className="h-5 w-5"/>Published</label>
        <div className="sm:col-span-2"><SubmitButton pending="Creating…">Add category</SubmitButton></div>
      </form>

      <ul className="divide-y divide-sand border-y border-sand text-sm">
        {data?.map((c) => (<li key={c.id} className="py-6">
            <form action={saveCategory} className="grid max-w-3xl gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id}/>
              <p className="text-xs text-taupe sm:col-span-2">/category/{c.slug}</p>
              <div><label htmlFor={`n-${c.id}`} className="mb-1 block text-sm">Name</label><input id={`n-${c.id}`} name="name" defaultValue={c.name} required className={input}/></div>
              <div><label htmlFor={`d-${c.id}`} className="mb-1 block text-sm">Description</label><input id={`d-${c.id}`} name="description" defaultValue={c.description ?? ""} className={input}/></div>
              <div><label htmlFor={`st-${c.id}`} className="mb-1 block text-sm">SEO title</label><input id={`st-${c.id}`} name="seo_title" defaultValue={c.seo_title ?? ""} className={input}/></div>
              <div><label htmlFor={`sd-${c.id}`} className="mb-1 block text-sm">SEO description</label><input id={`sd-${c.id}`} name="seo_description" defaultValue={c.seo_description ?? ""} className={input}/></div>
              <div className="sm:col-span-2"><ImageField name="image" label="Category image" currentUrl={c.image_url} alt={c.name} removeName="remove_image"/></div>
              <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={c.published} className="h-5 w-5"/>Published</label>
              <div className="flex gap-2 sm:col-span-2"><SubmitButton className="btn-dark min-h-11 px-6" pending="Saving…">Save</SubmitButton></div>
            </form>
            <form action={deleteCategory} className="mt-2"><input type="hidden" name="id" value={c.id}/><ConfirmButton message={`Delete category “${c.name}”? Its image file is only removed if no other item uses it.`} className="min-h-11 text-xs underline">Delete category</ConfirmButton></form>
          </li>))}
      </ul>
      <p className="mt-4 text-xs text-taupe">A category with products can&apos;t be deleted until they are moved.</p>
    </>);
}
