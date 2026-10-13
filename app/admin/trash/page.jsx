import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
import { back } from "@/lib/cms-admin";
import Flash from "@/components/admin/Flash";

async function restoreOrder(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  if (!uuid(id)) back("/admin/trash", "error", "Invalid order ID.");
  const { error } = await sb.rpc("admin_set_order_trashed", { p_order: id, p_trashed: false });
  if (error) {
    console.error("[admin/trash] order restore failed", error.code);
    back("/admin/trash", "error", "Could not restore this order. Check the database migration and try again.");
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin/trash");
  back("/admin/trash", "ok", "Order restored to active Orders.");
}

async function restoreCustomer(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  if (!uuid(id)) back("/admin/trash", "error", "Invalid customer ID.");
  const { error } = await sb.rpc("admin_set_customer_trashed", { p_customer: id, p_trashed: false });
  if (error) {
    console.error("[admin/trash] customer restore failed", error.code);
    back("/admin/trash", "error", "Could not restore this customer profile. Check the database migration and try again.");
  }
  revalidatePath("/admin/customers");
  revalidatePath("/admin/trash");
  back("/admin/trash", "ok", "Customer profile restored to Customers.");
}

export default async function AdminTrash({ searchParams }) {
  const sb = await requireAdmin();
  const sp = await searchParams;
  const [{ data: orders, error: ordersError }, { data: customers, error: customersError }] = await Promise.all([
    sb.from("orders").select("id,email,status,payment_status,total_cents,created_at,trashed_at").not("trashed_at", "is", null).order("trashed_at", { ascending: false }).limit(100),
    sb.from("profiles").select("id,email,full_name,created_at,trashed_at").eq("role", "customer").not("trashed_at", "is", null).order("trashed_at", { ascending: false }).limit(100),
  ]);

  return (
    <>
      <h1 className="mb-3 font-serif text-4xl">Trash</h1>
      <p className="mb-6 text-sm text-taupe">Items here are hidden, not permanently deleted. Restore an item to return it to its original admin list.</p>
      <Flash ok={sp?.ok} error={sp?.error} />

      <section className="mb-10">
        <h2 className="mb-3 text-xs uppercase tracking-[0.18em]">Trashed orders</h2>
        {ordersError ? (
          <p role="alert" className="border border-red-800 p-3 text-sm text-red-800">Could not load trashed orders. Make sure migration 0027 has been applied in Supabase.</p>
        ) : !orders?.length ? (
          <p className="border-y border-sand py-4 text-sm text-taupe">No orders in Trash.</p>
        ) : (
          <ul className="divide-y divide-sand border-y border-sand text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">#{o.id.slice(0, 8)} · {o.email} · {money(o.total_cents / 100, "BDT")}</p>
                  <p className="mt-1 text-xs text-taupe">Status: {o.status} · Payment: {o.payment_status} · Ordered {new Date(o.created_at).toLocaleDateString("en-GB")} · Trashed {new Date(o.trashed_at).toLocaleDateString("en-GB")}</p>
                </div>
                <form action={restoreOrder}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" className="border border-umber px-3 py-2 text-xs font-medium hover:bg-sand">Restore order</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.18em]">Trashed customer profiles</h2>
        {customersError ? (
          <p role="alert" className="border border-red-800 p-3 text-sm text-red-800">Could not load trashed customer profiles. Make sure migration 0027 has been applied in Supabase.</p>
        ) : !customers?.length ? (
          <p className="border-y border-sand py-4 text-sm text-taupe">No customer profiles in Trash.</p>
        ) : (
          <ul className="divide-y divide-sand border-y border-sand text-sm">
            {customers.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{p.full_name || "—"} · {p.email || "No email"}</p>
                  <p className="mt-1 text-xs text-taupe">Joined {new Date(p.created_at).toLocaleDateString("en-GB")} · Trashed {new Date(p.trashed_at).toLocaleDateString("en-GB")}</p>
                </div>
                <form action={restoreCustomer}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="border border-umber px-3 py-2 text-xs font-medium hover:bg-sand">Restore customer</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
