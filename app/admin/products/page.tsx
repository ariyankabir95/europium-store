import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
async function act(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"), op = str(fd, "op"); if (!uuid(id)) return;
  if (op === "delete") await sb.from("products").delete().eq("id", id); else await sb.from("products").update({ published: op === "publish" }).eq("id", id);
  revalidatePath("/admin/products");
}
export default async function Products() {
  const sb = await requireAdmin();
  const { data } = await sb.from("products").select("id,name,slug,price_cents,sale_price_cents,published").order("created_at", { ascending: false });
  return (<><div className="mb-6 flex justify-between"><h1 className="font-serif text-4xl">Products</h1><Link href="/admin/products/new" className="btn-dark">New product</Link></div>
    <ul className="divide-y divide-sand border-y border-sand text-sm">{data?.map((p) => (<li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span><Link href={`/admin/products/${p.id}`} className="underline">{p.name}</Link> · {money((p.sale_price_cents ?? p.price_cents) / 100)} · {p.published ? "Published" : "Draft"}</span>
      <form action={act} className="flex gap-2"><input type="hidden" name="id" value={p.id} /><button name="op" value={p.published ? "unpublish" : "publish"} className="btn-line min-h-11 px-4">{p.published ? "Unpublish" : "Publish"}</button><button name="op" value="delete" className="btn-line min-h-11 px-4">Delete</button></form></li>))}</ul></>);
}
