import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back } from "@/lib/cms-admin";
import Flash from "@/components/admin/Flash";
import ConfirmSubmit from "@/components/ui/ConfirmSubmit";
const STATUSES = ["pending", "approved", "rejected"];
const LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const BADGE = { pending: "border-taupe text-umber", approved: "border-charcoal bg-charcoal text-warm", rejected: "border-red-800 text-red-800" };
/** Where to return after an action: the same filtered list. Only same-page paths are accepted. */
function returnTo(fd) {
    const r = str(fd, "return", 200);
    return /^\/admin\/reviews(\?[\w=&%.+-]*)?$/.test(r) ? r : "/admin/reviews";
}
async function moderate(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "review_id", 40), op = str(fd, "op", 20), ret = returnTo(fd);
    if (!uuid(id) || !["approved", "rejected", "delete"].includes(op))
        back(ret, "error", "Invalid request.");
    if (op === "delete") {
        const { data, error } = await sb.from("reviews").delete().eq("id", id).select("id");
        if (error) {
            console.error("[reviews] delete failed:", error.code, error.message);
            back(ret, "error", "The review could not be deleted. Please try again.");
        }
        // A delete blocked by row-level security returns NO error and zero rows, so zero rows must be treated as a failure.
        if (!data?.length) {
            console.error("[reviews] delete affected 0 rows (already gone, or denied by RLS):", id);
            back(ret, "error", "Nothing was deleted. The review may already be gone, or the database refused the change.");
        }
        revalidatePath("/admin/reviews");
        back(ret, "ok", "Review deleted.");
    }
    const from = op === "approved" ? ["pending", "rejected"] : ["pending", "approved"];
    const { data, error } = await sb.from("reviews").update({ status: op }).eq("id", id).in("status", from).select("id,status");
    if (error) {
        console.error("[reviews] status update failed:", error.code, error.message);
        // 23505: approving would give this customer a second active review for the same product.
        back(ret, "error", error.code === "23505" ? "Not changed: this customer already has another active review for this product." : "The review status could not be changed. Please try again.");
    }
    if (!data?.length) {
        console.error("[reviews] status update affected 0 rows (status already changed, or denied by RLS):", id, op);
        back(ret, "error", "Nothing was changed. The review was already updated, or the database refused the change. Reload the page and check its status.");
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/product/[slug]", "page");
    back(ret, "ok", op === "approved" ? "Review approved. It is now public." : "Review rejected. It is hidden from the public.");
}
export default async function Reviews({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const filter = STATUSES.includes(sp.status) ? sp.status : null;
    const q = (sp.q ?? "").trim().slice(0, 100).toLowerCase();
    let query = sb.from("reviews").select("id,rating,body,status,created_at,moderation_note,products(name)").order("created_at", { ascending: false }).limit(300);
    if (filter)
        query = query.eq("status", filter);
    const [list, ...counts] = await Promise.all([query, ...STATUSES.map((s) => sb.from("reviews").select("id", { count: "exact", head: true }).eq("status", s))]);
    const loadError = list.error;
    if (loadError)
        console.error("[reviews] load failed:", loadError.code, loadError.message);
    const total = counts.reduce((n, c) => n + (c.count ?? 0), 0);
    const count = (s) => counts[STATUSES.indexOf(s)].count ?? 0;
    const rows = (list.data ?? []).filter((r) => !q || (r.body ?? "").toLowerCase().includes(q) || (r.products?.name ?? "").toLowerCase().includes(q));
    const qs = (status) => { const p = new URLSearchParams(); if (status)
        p.set("status", status); if (q)
        p.set("q", q); const s = p.toString(); return `/admin/reviews${s ? `?${s}` : ""}`; };
    const here = qs(filter);
    return (<>
    <h1 className="mb-6 font-serif text-4xl">Reviews</h1>
    <Flash ok={sp.ok} error={sp.error}/>
    {loadError && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">Reviews could not be loaded. Check the server log and your database connection.</p>}

    <nav aria-label="Review status" className="mb-4 flex flex-wrap gap-2 text-sm">
      {[[null, "All", total], ...STATUSES.map((s) => [s, LABEL[s], count(s)])].map(([s, l, n]) => (<Link key={l} href={qs(s)} aria-current={filter === s ? "page" : undefined} className={`min-h-11 border px-4 py-3 ${filter === s ? "border-charcoal bg-charcoal text-warm" : "border-sand hover:bg-cream"}`}>{l} ({n})</Link>))}
    </nav>
    <form method="get" action="/admin/reviews" className="mb-6 flex max-w-xl gap-2">
      {filter && <input type="hidden" name="status" value={filter}/>}
      <label htmlFor="q" className="sr-only">Search reviews</label>
      <input id="q" name="q" defaultValue={q} placeholder="Search product or review text" className="min-h-11 flex-1 border border-sand bg-transparent px-3"/>
      <button className="btn-line min-h-11 px-4">Search</button>
      {q && <Link href={qs(filter)} className="min-h-11 py-3 text-sm underline">Clear</Link>}
    </form>

    {!rows.length && !loadError ? <p className="text-umber">{filter || q ? "No reviews match this filter." : "No reviews yet."}</p> : (<ul className="divide-y divide-sand border-y border-sand text-sm">{rows.map((r) => (<li key={r.id} className="py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <strong>{r.products?.name ?? "Deleted product"}</strong>
            <span aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-sand">{"★".repeat(5 - r.rating)}</span></span>
            <span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${BADGE[r.status]}`}>{LABEL[r.status]}</span>
            {r.created_at && <time dateTime={r.created_at} className="text-xs text-taupe">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>}
          </div>
          <p className="my-2 whitespace-pre-line text-umber">{r.body}</p>
          {r.moderation_note && <p className="mb-2 text-xs text-taupe">{r.moderation_note}</p>}
          <form action={moderate} className="flex flex-wrap gap-2">
            <input type="hidden" name="review_id" value={r.id}/><input type="hidden" name="return" value={here}/>
            {r.status !== "approved" && <button name="op" value="approved" className="btn-line min-h-11 px-4">Approve</button>}
            {r.status !== "rejected" && <button name="op" value="rejected" className="btn-line min-h-11 px-4">Reject</button>}
            <ConfirmSubmit name="op" value="delete" message="Delete this review permanently? This cannot be undone." className="btn-line min-h-11 px-4 text-red-800">Delete</ConfirmSubmit>
          </form>
        </li>))}</ul>)}
    {rows.length >= 300 && <p className="mt-4 text-xs text-taupe">Showing the latest 300 reviews. Use the filters to narrow the list.</p>}
  </>);
}
