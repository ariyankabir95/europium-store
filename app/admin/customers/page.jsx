import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { money } from "@/lib/format";
import { back } from "@/lib/cms-admin";
import ConfirmButton from "@/components/admin/ConfirmButton";

async function trashCustomer(fd) {
  "use server";
  const sb = await requireAdmin();
  const id = str(fd, "id");
  if (!uuid(id)) back("/admin/customers", "error", "Invalid customer ID.");

  const { error } = await sb.rpc("admin_set_customer_trashed", { p_customer: id, p_trashed: true });
  if (error) {
    console.error("[admin/customers] trash action failed", error.code);
    back("/admin/customers", "error", "Could not move this customer profile to Trash. Check the database migration and try again.");
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/trash");
  back("/admin/customers", "ok", "Customer profile moved to Trash. Restore it any time from Admin → Trash.");
}

export default async function Customers({ searchParams }) {
  const sb = await requireAdmin();
  const sp = await searchParams;
  const [{ data: people, error: peopleError }, { data: orders, error: ordersError }] = await Promise.all([
    sb.from("profiles").select("id,email,full_name,role,created_at").is("trashed_at", null).order("created_at", { ascending: false }).limit(200),
    sb.from("orders").select("user_id,total_cents,status").is("trashed_at", null).not("user_id", "is", null),
  ]);
  const stats = new Map();
  orders?.forEach((o) => {
    if (o.status === "cancelled" || o.status === "refunded") return;
    const s = stats.get(o.user_id) ?? { n: 0, sum: 0 };
    s.n++;
    s.sum += o.total_cents;
    stats.set(o.user_id, s);
  });

  return (
    <>
      <h1 className="mb-3 font-serif text-4xl">Customers</h1>
      <p className="mb-3 text-sm text-taupe">Customer Trash hides a profile from this list but keeps the account and order history for recovery.</p>
      <p className="mb-6 text-sm"><a href="/admin/trash" className="underline">View Trash / restore items</a></p>
      {sp?.ok && <p role="status" className="mb-4 border border-green-800 p-3 text-sm text-green-800">{sp.ok}</p>}
      {sp?.error && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">{sp.error}</p>}
      {peopleError && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Could not load customers. If the Trash migration was just added, apply it in Supabase first.</p>}
      {ordersError && <p role="alert" className="mb-4 border border-red-800 p-3 text-sm text-red-800">Order totals could not be loaded.</p>}
      {!people?.length ? <p className="text-umber">No active customer profiles.</p> : (
        <ul className="divide-y divide-sand border-y border-sand text-sm">
          {people.map((p) => {
            const s = stats.get(p.id);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p>{p.full_name || "—"} · {p.email || "No email"}{p.role === "admin" && " · admin"}</p>
                  <p className="mt-1 text-xs text-taupe">{s?.n ?? 0} orders · {money((s?.sum ?? 0) / 100, "BDT")} · joined {new Date(p.created_at).toLocaleDateString("en-US")}</p>
                </div>
                {p.role === "customer" && (
                  <form action={trashCustomer}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton
                      message="Move this customer profile to Trash? Their account and order history will be kept, and you can restore the profile later."
                      className="border border-red-800 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-50"
                    >
                      Move to Trash
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
