import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, cents, uuid } from "@/lib/admin";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ImageField from "@/components/admin/ImageField";
import SubmitButton from "@/components/admin/SubmitButton";
import SmartImage from "@/components/ui/SmartImage";
import { addProductImages, orderedImages } from "@/lib/product-images";
import { moveProductImage, removeProductImage, replaceProductImage, setPrimaryProductImage, uploadProductImages } from "@/app/admin/products/image-actions";
async function save(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id"), price = cents(fd, "price"), sale = str(fd, "sale") ? cents(fd, "sale") : null, slug = str(fd, "slug", 120).toLowerCase(), name = str(fd, "name", 200);
    if (!name || !/^[a-z0-9-]+$/.test(slug) || price < 0 || (sale !== null && (sale < 0 || sale >= price)))
        return redirect(`/admin/products/${id || "new"}?error=1`);
    const row = { name, slug, sku: str(fd, "sku", 60) || null, description: str(fd, "description", 5000), price_cents: price, sale_price_cents: sale, category_id: uuid(str(fd, "category")) ? str(fd, "category") : null, tags: str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean), badge: ["NEW", "SALE", "BESTSELLER"].includes(str(fd, "badge")) ? str(fd, "badge") : null, materials: str(fd, "materials"), care: str(fd, "care"), seo_title: str(fd, "seo_title", 120) || null, seo_description: str(fd, "seo_description", 300) || null, published: fd.get("published") === "on" };
    if (uuid(id)) {
        const { error } = await sb.from("products").update(row).eq("id", id);
        if (error)
            return redirect(`/admin/products/${id}?error=1`);
        revalidatePath("/admin/products");
        revalidatePath("/");
        redirect("/admin/products");
    }
    const { data: created, error } = await sb.from("products").insert(row).select("id").single();
    if (error || !created)
        return redirect("/admin/products/new?error=1");
    // Images chosen on the "new product" form are attached to the product that was just created.
    const { added, errors } = await addProductImages(sb, created.id, fd.getAll("files"), str(fd, "name", 200));
    revalidatePath("/admin/products");
    revalidatePath("/");
    const note = errors.length ? `ierr=${encodeURIComponent(`Product created. Image upload failed for: ${errors.join(" ")}`)}` : `iok=${encodeURIComponent(added ? `Product created with ${added} image(s). Now add variants below.` : "Product created. Now add variants and images below.")}`;
    redirect(`/admin/products/${created.id}?${note}#images`);
}
// --- Variants -------------------------------------------------------------
function variantFields(fd) {
    return { size: str(fd, "size", 20), color: str(fd, "color", 60), hex: str(fd, "hex", 7) || "#cccccc", sku: str(fd, "sku", 60).toUpperCase(), stock: Math.trunc(Number(str(fd, "stock"))), low: Math.trunc(Number(str(fd, "low"))) };
}
function variantValid(v) { return !!v.size && !!v.color && !!v.sku && v.stock >= 0 && v.low >= 0; }
async function createVariant(fd) {
    "use server";
    const sb = await requireAdmin();
    const pid = str(fd, "product_id");
    if (!uuid(pid))
        return;
    const v = variantFields(fd);
    if (!variantValid(v))
        redirect(`/admin/products/${pid}?verror=1`);
    const { data: dupSku } = await sb.from("product_variants").select("id").eq("sku", v.sku).maybeSingle();
    if (dupSku)
        redirect(`/admin/products/${pid}?verror=sku`);
    const { data: dupCombo } = await sb.from("product_variants").select("id").eq("product_id", pid).eq("size", v.size).eq("color_name", v.color).maybeSingle();
    if (dupCombo)
        redirect(`/admin/products/${pid}?verror=combo`);
    const { error } = await sb.from("product_variants").insert({ product_id: pid, size: v.size, color_name: v.color, color_hex: v.hex, sku: v.sku, stock: v.stock, low_stock_threshold: v.low });
    if (error)
        redirect(`/admin/products/${pid}?verror=1`);
    revalidatePath(`/admin/products/${pid}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/");
}
async function updateVariant(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id"), pid = str(fd, "product_id");
    if (!uuid(id) || !uuid(pid))
        return;
    const v = variantFields(fd);
    if (!variantValid(v))
        redirect(`/admin/products/${pid}?verror=1`);
    const { data: dupSku } = await sb.from("product_variants").select("id").eq("sku", v.sku).neq("id", id).maybeSingle();
    if (dupSku)
        redirect(`/admin/products/${pid}?verror=sku`);
    const { data: dupCombo } = await sb.from("product_variants").select("id").eq("product_id", pid).eq("size", v.size).eq("color_name", v.color).neq("id", id).maybeSingle();
    if (dupCombo)
        redirect(`/admin/products/${pid}?verror=combo`);
    // Stock is editable here; reserved is never part of this form, so an admin edit can't corrupt it.
    const { error } = await sb.from("product_variants").update({ size: v.size, color_name: v.color, color_hex: v.hex, sku: v.sku, stock: v.stock, low_stock_threshold: v.low, active: fd.get("active") === "on" }).eq("id", id);
    if (error)
        redirect(`/admin/products/${pid}?verror=1`);
    revalidatePath(`/admin/products/${pid}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/");
}
async function removeVariant(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id"), pid = str(fd, "product_id");
    if (!uuid(id) || !uuid(pid))
        return;
    const { data: v } = await sb.from("product_variants").select("reserved").eq("id", id).single();
    const { count } = await sb.from("order_items").select("*", { count: "exact", head: true }).eq("variant_id", id);
    // A variant with reserved stock or order history is never hard-deleted: it's archived (deactivated) so past orders stay intact.
    if ((v?.reserved ?? 0) > 0 || (count ?? 0) > 0)
        await sb.from("product_variants").update({ active: false }).eq("id", id);
    else {
        const { error } = await sb.from("product_variants").delete().eq("id", id);
        if (error)
            await sb.from("product_variants").update({ active: false }).eq("id", id);
    }
    revalidatePath(`/admin/products/${pid}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/");
}
async function reactivateVariant(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id"), pid = str(fd, "product_id");
    if (!uuid(id) || !uuid(pid))
        return;
    await sb.from("product_variants").update({ active: true }).eq("id", id);
    revalidatePath(`/admin/products/${pid}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/");
}
export default async function Edit({ params, searchParams }) {
    const sb = await requireAdmin();
    const { id } = await params;
    const { error, verror, iok, ierr } = await searchParams;
    const { data: p } = uuid(id) ? await sb.from("products").select("*").eq("id", id).single() : { data: null };
    const { data: cats } = await sb.from("categories").select("id,name").order("name");
    const imgs = p ? await orderedImages(sb, p.id) : [];
    const { data: variants } = p ? await sb.from("product_variants").select("*").eq("product_id", p.id).order("size").order("color_name") : { data: [] };
    const i = "min-h-11 w-full border border-sand bg-transparent px-3 py-2";
    const F = (n, l, v, t = "text") => <div><label htmlFor={n} className="mb-1 block text-sm">{l}</label><input id={n} name={n} type={t} defaultValue={v ?? ""} className={i}/></div>;
    return (<><h1 className="mb-6 font-serif text-4xl">{p ? "Edit product" : "New product"}</h1><Flash ok={iok} error={ierr}/>{error && <p role="alert" className="mb-4 text-sm text-red-800">Check the fields: name, a lowercase-hyphen slug, and a sale price below the price.</p>}
    <form action={save} className="grid max-w-2xl gap-4 sm:grid-cols-2"><input type="hidden" name="id" value={p?.id ?? ""}/>
      {F("name", "Name", p?.name)}{F("slug", "Slug", p?.slug)}{F("sku", "SKU", p?.sku)}{F("tags", "Tags (comma separated)", p?.tags?.join(", "))}
      {F("price", "Price (BDT)", p ? p.price_cents / 100 : "", "number")}{F("sale", "Sale price (BDT)", p?.sale_price_cents ? p.sale_price_cents / 100 : "", "number")}
      <div><label htmlFor="category" className="mb-1 block text-sm">Category</label><select id="category" name="category" defaultValue={p?.category_id ?? ""} className={i}><option value="">None</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label htmlFor="badge" className="mb-1 block text-sm">Badge</label><select id="badge" name="badge" defaultValue={p?.badge ?? ""} className={i}><option value="">None</option><option>NEW</option><option>SALE</option><option>BESTSELLER</option></select></div>
      <div className="sm:col-span-2"><label htmlFor="description" className="mb-1 block text-sm">Description</label><textarea id="description" name="description" rows={4} defaultValue={p?.description ?? ""} className={i}/></div>
      {F("materials", "Materials", p?.materials)}{F("care", "Care", p?.care)}{F("seo_title", "SEO title", p?.seo_title)}{F("seo_description", "SEO description", p?.seo_description)}
      {!p && <div className="sm:col-span-2"><ImageField name="files" label="Product images (optional)" multiple help="The first image becomes the main image. You can add more later."/></div>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={p?.published} className="h-5 w-5"/>Published</label><div className="sm:col-span-2"><SubmitButton pending="Saving…">Save product</SubmitButton></div></form>
    <p className="mt-6 text-sm text-taupe">{p ? "Manage this product's sizes and colors below." : "Save the product first, then reopen it here to add variants and images."}</p>

    {p && <section className="mt-10 max-w-3xl"><h2 className="mb-2 font-serif text-2xl">Variants</h2>
      <p className="mb-4 text-sm text-taupe">Each size/color combination is one variant. Stock edited here also updates Inventory. Archiving hides a variant from customers without losing its order history; a variant with reserved stock or past orders is archived instead of deleted.</p>
      {verror && <p role="alert" className="mb-4 text-sm text-red-800">{verror === "sku" ? "That SKU is already used by another variant." : verror === "combo" ? "This size and color combination already exists for this product." : "Size, color and SKU are required, and stock and the low-stock threshold can't be negative."}</p>}
      <ul className="mb-6 divide-y divide-sand border-y border-sand text-sm">{variants?.map((v) => (<li key={v.id} className="py-4">
          {v.active === false && <p className="mb-2 text-xs font-semibold text-taupe">Inactive</p>}
          <form action={updateVariant} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={v.id}/><input type="hidden" name="product_id" value={p.id}/>
            <div><label htmlFor={`size-${v.id}`} className="mb-1 block text-xs">Size</label><input id={`size-${v.id}`} name="size" defaultValue={v.size ?? ""} className="min-h-11 w-16 border border-sand bg-transparent px-2"/></div>
            <div><label htmlFor={`color-${v.id}`} className="mb-1 block text-xs">Color</label><input id={`color-${v.id}`} name="color" defaultValue={v.color_name ?? ""} className="min-h-11 w-28 border border-sand bg-transparent px-2"/></div>
            <div><label htmlFor={`hex-${v.id}`} className="mb-1 block text-xs">Hex</label><input id={`hex-${v.id}`} name="hex" defaultValue={v.color_hex ?? ""} className="min-h-11 w-20 border border-sand bg-transparent px-2"/></div>
            <div><label htmlFor={`sku-${v.id}`} className="mb-1 block text-xs">SKU</label><input id={`sku-${v.id}`} name="sku" defaultValue={v.sku ?? ""} className="min-h-11 w-32 border border-sand bg-transparent px-2"/></div>
            <div><label htmlFor={`stock-${v.id}`} className="mb-1 block text-xs">Stock</label><input id={`stock-${v.id}`} name="stock" type="number" min={0} defaultValue={v.stock} className="min-h-11 w-20 border border-sand bg-transparent px-2"/></div>
            <p className="pb-2.5 text-xs text-taupe">Reserved {v.reserved}</p>
            <div><label htmlFor={`low-${v.id}`} className="mb-1 block text-xs">Low at</label><input id={`low-${v.id}`} name="low" type="number" min={0} defaultValue={v.low_stock_threshold ?? 5} className="min-h-11 w-20 border border-sand bg-transparent px-2"/></div>
            <label className="flex items-center gap-1 pb-2.5 text-xs"><input type="checkbox" name="active" defaultChecked={v.active !== false} className="h-5 w-5"/>Active</label>
            <button className="btn-line min-h-11 px-4">Save</button>
          </form>
          {v.active === false
                    ? <form action={reactivateVariant} className="mt-2"><input type="hidden" name="id" value={v.id}/><input type="hidden" name="product_id" value={p.id}/><button className="min-h-11 text-xs underline">Reactivate</button></form>
                    : <form action={removeVariant} className="mt-2"><input type="hidden" name="id" value={v.id}/><input type="hidden" name="product_id" value={p.id}/><button className="min-h-11 text-xs underline">{v.reserved > 0 ? "Archive (has reserved stock)" : "Archive / delete"}</button></form>}
        </li>))}{!variants?.length && <li className="py-4 text-umber">No variants yet. Customers can't buy this product until at least one active variant exists.</li>}</ul>
      <form action={createVariant} className="flex flex-wrap items-end gap-2 border-t border-sand pt-4"><input type="hidden" name="product_id" value={p.id}/>
        <div><label htmlFor="new-size" className="mb-1 block text-xs">Size</label><input id="new-size" name="size" required className="min-h-11 w-16 border border-sand bg-transparent px-2"/></div>
        <div><label htmlFor="new-color" className="mb-1 block text-xs">Color</label><input id="new-color" name="color" required className="min-h-11 w-28 border border-sand bg-transparent px-2"/></div>
        <div><label htmlFor="new-hex" className="mb-1 block text-xs">Hex</label><input id="new-hex" name="hex" placeholder="#cccccc" className="min-h-11 w-20 border border-sand bg-transparent px-2"/></div>
        <div><label htmlFor="new-sku" className="mb-1 block text-xs">SKU</label><input id="new-sku" name="sku" required className="min-h-11 w-32 border border-sand bg-transparent px-2"/></div>
        <div><label htmlFor="new-stock" className="mb-1 block text-xs">Stock</label><input id="new-stock" name="stock" type="number" min={0} defaultValue={0} className="min-h-11 w-20 border border-sand bg-transparent px-2"/></div>
        <div><label htmlFor="new-low" className="mb-1 block text-xs">Low at</label><input id="new-low" name="low" type="number" min={0} defaultValue={5} className="min-h-11 w-20 border border-sand bg-transparent px-2"/></div>
        <button className="btn-dark min-h-11 px-6">Add variant</button>
      </form>
    </section>}

    {p && <section id="images" className="mt-10 max-w-3xl"><h2 className="mb-2 font-serif text-2xl">Images</h2><p className="mb-4 text-sm text-taupe">The first image is the <strong>main image</strong> (shown on cards and first on the product page); the second shows on hover. Use &ldquo;Make main&rdquo; or the arrows to change the order. Removing an image detaches it from this product; its file is deleted from Storage only if nothing else uses it.</p>
      {imgs.length === 0 && <p className="mb-4 text-sm text-umber">No images yet. Customers will see the placeholder until you upload one.</p>}
      <ul className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">{imgs.map((m, n) => (<li key={m.id} className="border border-sand p-3 text-xs">
          <div className="relative mb-3 aspect-[4/5] w-full max-w-[200px] bg-cream"><SmartImage src={m.url} alt={`${p.name} image ${n + 1}`} sizes="200px" fallback={<div className="flex h-full items-center justify-center p-2 text-center text-taupe">Image not available</div>}/>{n === 0 && <span className="absolute left-2 top-2 bg-charcoal px-2 py-1 text-[10px] tracking-[0.12em] text-warm uppercase">Main</span>}</div>
          <div className="flex flex-wrap gap-2">
            {n > 0 && <form action={setPrimaryProductImage}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="image_id" value={m.id}/><button className="btn-line min-h-11 px-3">Make main</button></form>}
            {n > 0 && <form action={moveProductImage}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="image_id" value={m.id}/><input type="hidden" name="dir" value="up"/><button aria-label="Move earlier" className="btn-line min-h-11 px-3">←</button></form>}
            {n < imgs.length - 1 && <form action={moveProductImage}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="image_id" value={m.id}/><input type="hidden" name="dir" value="down"/><button aria-label="Move later" className="btn-line min-h-11 px-3">→</button></form>}
            <form action={removeProductImage}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="image_id" value={m.id}/><ConfirmButton message="Remove this image from the product?" className="btn-line min-h-11 px-3">Remove</ConfirmButton></form>
          </div>
          <form action={replaceProductImage} className="mt-3 space-y-2 border-t border-sand pt-3"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="image_id" value={m.id}/><ImageField name="file" label="Replace this image" help="Saved only when you press Replace."/><SubmitButton className="btn-line min-h-11 px-4" pending="Uploading…">Replace</SubmitButton></form>
        </li>))}</ul>
      <form action={uploadProductImages} className="space-y-3 border-t border-sand pt-4"><input type="hidden" name="id" value={p.id}/><h3 className="text-xs tracking-[0.18em] uppercase">Add images</h3><ImageField name="files" label="Choose one or more images" multiple help={`Up to 12 at once. They are added after the existing images.`}/><div><label htmlFor="alt" className="mb-1 block text-sm">Alt text (optional)</label><input id="alt" name="alt" placeholder={p.name} className="min-h-11 w-full max-w-md border border-sand bg-transparent px-3"/></div><SubmitButton pending="Uploading…">Upload images</SubmitButton></form></section>}</>);
}
