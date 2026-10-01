import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
async function act(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"), op = str(fd, "op"); if (!uuid(id)) return;
  if (op === "delete") await sb.from("reviews").delete().eq("id", id); else if (op === "approved" || op === "rejected") await sb.from("reviews").update({ status: op }).eq("id", id);
  revalidatePath("/admin/reviews");
}
export default async function Reviews() {
  const sb = await requireAdmin(); const { data } = await sb.from("reviews").select("id,rating,body,status,created_at,products(name)").order("created_at", { ascending: false }).limit(100);
  return (<><h1 className="mb-6 font-serif text-4xl">Reviews</h1>{!data?.length ? <p className="text-umber">No reviews yet.</p> : <ul className="divide-y divide-sand border-y border-sand text-sm">{data.map((r) => <li key={r.id} className="py-4"><p>{(r.products as unknown as { name: string } | null)?.name} · {"★".repeat(r.rating)} · <em>{r.status}</em></p><p className="my-2 text-umber">{r.body}</p>
    <form action={act} className="flex gap-2"><input type="hidden" name="id" value={r.id} />{["approved", "rejected", "delete"].map((o) => <button key={o} name="op" value={o} className="btn-line min-h-11 px-4 capitalize">{o === "approved" ? "Approve" : o === "rejected" ? "Reject" : "Delete"}</button>)}</form></li>)}</ul>}</>);
}
