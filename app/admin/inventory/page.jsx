import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";

const PAGE_SIZE = 50;

async function update(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  const stock = Math.trunc(Number(str(fd, "stock")));
  const low = Math.trunc(Number(str(fd, "low")));
  if (!uuid(id) || !Number.isSafeInteger(stock) || stock < 0 || !Number.isSafeInteger(low) || low < 0) return;
  const { error } = await sb.from("product_variants").update({ stock, low_stock_threshold: low }).eq("id", id);
  if (error) redirect("/admin/inventory?error=Could%20not%20update%20inventory.%20Refresh%20the%20page%20and%20try%20again.");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
}

function inventoryUrl(q, page) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/inventory?${suffix}` : "/admin/inventory";
}

export default async function Inventory({ searchParams }) {
  const sb = await requireAdmin();
  const sp = await searchParams;
  const rawQuery = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = String(rawQuery ?? "").trim().slice(0, 80).replace(/[^a-zA-Z0-9 _-]/g, " ").trim();
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const requestedPage = Math.trunc(Number(rawPage ?? 1));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const start = (page - 1) * PAGE_SIZE;

  let query = sb
    .from("product_variants")
    .select("id,product_id,size,color_name,sku,stock,reserved,low_stock_threshold,active,products(name)", { count: "exact" })
    .order("sku", { ascending: true })
    .range(start, start + PAGE_SIZE - 1);

  if (q) query = query.or(`sku.ilike.%${q}%,size.ilike.%${q}%,color_name.ilike.%${q}%`);

  const { data, count, error } = await query;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownPage = Math.min(page, pages);
  if (total > 0 && page > pages) redirect(inventoryUrl(q, pages));

  return (
    <>
      <h1 className="mb-2 font-serif text-4xl">Inventory</h1>
      <p className="mb-6 text-sm text-taupe">Stock and threshold can be adjusted here. To add, edit, archive or delete a variant, open the product under Products.</p>
      <form method="get" action="/admin/inventory" className="mb-6 flex max-w-2xl flex-wrap gap-2">
        <label htmlFor="inventory-search" className="sr-only">Search SKU, size or color</label>
        <input id="inventory-search" name="q" defaultValue={q} placeholder="Search SKU, size or color…" className="min-h-11 min-w-0 flex-1 border border-sand bg-transparent px-3"/>
        <button className="btn-dark min-h-11 px-5">Search</button>
        {q && <Link href="/admin/inventory" className="btn-line flex min-h-11 items-center px-4">Clear</Link>}
      </form>

      {sp.error && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">{String(sp.error)}</p>}
      {error && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Could not load inventory. Refresh the page or check the server logs.</p>}
      {!error && total === 0 && <p className="border-y border-sand py-5 text-sm text-umber">{q ? "No variants match that search." : "No variants yet. Add product sizes and colors under Products."}</p>}

      <ul className="divide-y divide-sand border-y border-sand text-sm">
        {data?.map((v) => {
          const avail = v.stock - v.reserved;
          const low = avail <= (v.low_stock_threshold ?? 5);
          return (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <Link href={`/admin/products/${v.product_id}`} className="underline">{v.products?.name ?? "Unknown product"}</Link>
                <span> · {v.size} / {v.color_name} · {v.sku} · stock {v.stock} · reserved {v.reserved} · available {avail}</span>
                {low && <strong className="ml-2 text-red-800">Low stock</strong>}
                {v.active === false && <strong className="ml-2 text-taupe">Inactive</strong>}
              </span>
              <form action={update} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={v.id}/>
                <label className="flex items-center gap-1 text-xs text-taupe">Stock<input name="stock" type="number" min={0} defaultValue={v.stock} aria-label="Stock" className="min-h-11 w-20 border border-sand bg-transparent px-2"/></label>
                <label className="flex items-center gap-1 text-xs text-taupe">Low at<input name="low" type="number" min={0} defaultValue={v.low_stock_threshold ?? 5} aria-label="Low stock threshold" className="min-h-11 w-20 border border-sand bg-transparent px-2"/></label>
                <button className="btn-line min-h-11 px-4">Save</button>
              </form>
            </li>
          );
        })}
      </ul>

      {!error && total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-taupe">Showing {start + 1}–{Math.min(start + (data?.length ?? 0), total)} of {total} variants · Page {shownPage} of {pages}</p>
          <div className="flex gap-2">
            {page > 1 && <Link href={inventoryUrl(q, page - 1)} className="btn-line flex min-h-11 items-center px-4">Previous</Link>}
            {page < pages && <Link href={inventoryUrl(q, page + 1)} className="btn-line flex min-h-11 items-center px-4">Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}
