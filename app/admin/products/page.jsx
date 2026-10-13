import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
import SmartImage from "@/components/ui/SmartImage";
import Flash from "@/components/admin/Flash";
import ConfirmButton from "@/components/admin/ConfirmButton";

async function act(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "product_id"), op = str(fd, "op");
  if (!uuid(id) || !["delete", "publish", "unpublish"].includes(op))
    redirect("/admin/products?error=Invalid%20product%20action.");

  if (op === "delete") {
    const { count, error: countError } = await sb.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (countError)
      redirect("/admin/products?error=Could%20not%20check%20product%20order%20history.");
    if ((count ?? 0) > 0)
      redirect("/admin/products?error=This%20product%20has%20order%20history%20and%20cannot%20be%20deleted.%20Unpublish%20it%20instead.");
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error)
      redirect("/admin/products?error=Could%20not%20delete%20this%20product.%20Check%20its%20variants%20and%20related%20records.");
  } else {
    const { error } = await sb.from("products").update({ published: op === "publish" }).eq("id", id);
    if (error)
      redirect("/admin/products?error=Could%20not%20update%20product%20visibility.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(`/admin/products?ok=${encodeURIComponent(op === "delete" ? "Product deleted." : op === "publish" ? "Product published." : "Product unpublished.")}`);
}

export default async function Products({ searchParams }) {
  const sb = await requireAdmin();
  const sp = await searchParams;
  const { data, error } = await sb.from("products").select("id,name,slug,price_cents,sale_price_cents,published,product_images(url,sort)").order("created_at", { ascending: false });
  return (
    <>
      <div className="mb-6 flex justify-between"><h1 className="font-serif text-4xl">Products</h1><Link href="/admin/products/new" className="btn-dark">New product</Link></div>
      <Flash ok={sp.ok} error={sp.error}/>
      {error && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Could not load products. Refresh the page or check the server logs.</p>}
      <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span className="flex items-center gap-3">
            <span className="relative block h-14 w-11 shrink-0 bg-cream"><SmartImage src={[...(p.product_images ?? [])].sort((a, b) => a.sort - b.sort)[0]?.url} alt="" sizes="44px"/></span>
            <span><Link href={`/admin/products/${p.id}`} className="underline">{p.name}</Link> · {money((p.sale_price_cents ?? p.price_cents) / 100, "BDT")} · {p.published ? "Published" : "Draft"}</span>
          </span>
          <form action={act} className="flex gap-2">
            <input type="hidden" name="product_id" value={p.id}/>
            <button name="op" value={p.published ? "unpublish" : "publish"} className="btn-line min-h-11 px-4">{p.published ? "Unpublish" : "Publish"}</button>
            <ConfirmButton name="op" value="delete" message={`Delete “${p.name}”? Products with order history cannot be deleted; you can unpublish them instead.`} className="btn-line min-h-11 px-4 text-red-800">Delete</ConfirmButton>
          </form>
        </li>
      ))}</ul>
    </>
  );
}
