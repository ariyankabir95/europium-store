import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
async function act(fd: FormData) {
  "use server";
  const sb = await requireAdmin(); const id = str(fd, "id"), op = str(fd, "op"); if (!uuid(id)) return;
  if (op === "delete") await sb.from("contact_messages").delete().eq("id", id); else await sb.from("contact_messages").update({ is_read: op === "read" }).eq("id", id);
  revalidatePath("/admin/messages");
}
export default async function Messages() {
  const sb = await requireAdmin(); const { data } = await sb.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  return (<><h1 className="mb-6 font-serif text-4xl">Messages</h1>{!data?.length ? <p className="text-umber">No messages yet.</p> : <ul className="divide-y divide-sand border-y border-sand text-sm">{data.map((m) => <li key={m.id} className="py-4"><p className={m.is_read ? "" : "font-semibold"}>{m.name} · {m.email} · {m.subject}</p><p className="my-2 whitespace-pre-line text-umber">{m.message}</p>
    <form action={act} className="flex gap-2"><input type="hidden" name="id" value={m.id} /><button name="op" value={m.is_read ? "unread" : "read"} className="btn-line min-h-11 px-4">Mark {m.is_read ? "unread" : "read"}</button><button name="op" value="delete" className="btn-line min-h-11 px-4">Delete</button></form></li>)}</ul>}</>);
}
