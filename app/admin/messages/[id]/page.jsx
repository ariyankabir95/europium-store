import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back } from "@/lib/cms-admin";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";
import ConfirmSubmit from "@/components/ui/ConfirmSubmit";
const LABEL = { unread: "Unread", read: "Read", replied: "Replied" };
const BADGE = { unread: "border-charcoal bg-charcoal text-warm", read: "border-sand text-umber", replied: "border-taupe text-charcoal" };
const here = (id) => `/admin/messages/${id}`;
const when = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
async function setStatus(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id", 40), op = str(fd, "op", 10);
    if (!uuid(id) || (op !== "read" && op !== "unread"))
        back("/admin/messages", "error", "Invalid request.");
    const { data, error } = await sb.from("contact_messages").update({ status: op }).eq("id", id).select("id");
    if (error) {
        console.error("[messages] status update failed:", error.code, error.message);
        back(here(id), "error", "The status could not be changed. Please try again.");
    }
    if (!data?.length) {
        console.error("[messages] status update affected 0 rows (missing, or denied by RLS):", id);
        back(here(id), "error", "Nothing was changed. The message may have been deleted, or the database refused the change.");
    }
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    back(here(id), "ok", op === "read" ? "Marked as read." : "Marked as unread.");
}
async function reply(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id", 40), body = str(fd, "body", 5000);
    if (!uuid(id))
        back("/admin/messages", "error", "Invalid request.");
    if (!body)
        back(here(id), "error", "Write a reply first.");
    // One transaction in the database: the reply is saved AND the message becomes "replied", or neither happens.
    const { error } = await sb.rpc("reply_to_message", { p_message_id: id, p_body: body });
    if (error) {
        console.error("[messages] reply failed:", error.code, error.message);
        back(here(id), "error", /reply_to_message|schema cache|does not exist/i.test(error.message) ? "Replies are not set up yet: run migration 0014_reviews_messages.sql in Supabase. The message was not changed." : "The reply could not be saved, so the message was not marked as replied. Your text is below; please try again.");
    }
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    back(here(id), "ok", "Reply saved to the conversation and the message is marked replied. No email was sent: no email provider is configured. Use “Email this reply” to send it from your own mail app.");
}
async function remove(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id", 40);
    if (!uuid(id))
        back("/admin/messages", "error", "Invalid request.");
    const { data, error } = await sb.from("contact_messages").delete().eq("id", id).select("id");
    if (error) {
        console.error("[messages] delete failed:", error.code, error.message);
        back(here(id), "error", "The message could not be deleted. Please try again.");
    }
    if (!data?.length) {
        console.error("[messages] delete affected 0 rows (already gone, or denied by RLS):", id);
        back(here(id), "error", "Nothing was deleted. The message may already be gone, or the database refused the change.");
    }
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    back("/admin/messages", "ok", "Message deleted.");
}
export default async function MessageDetail({ params, searchParams }) {
    const sb = await requireAdmin();
    const [{ id }, sp] = await Promise.all([params, searchParams]);
    if (!uuid(id))
        notFound();
    const { data: m, error } = await sb.from("contact_messages").select("id,name,email,subject,message,status,created_at,replied_at").eq("id", id).maybeSingle();
    if (error)
        console.error("[messages] load failed:", error.code, error.message);
    if (error)
        return (<><p className="mb-4 text-sm"><Link href="/admin/messages" className="underline underline-offset-4">← All messages</Link></p><p role="alert" className="border border-red-800 px-4 py-3 text-sm text-red-800">This message could not be loaded. If migration <code>0014_reviews_messages.sql</code> has not been run in Supabase yet, run it first; otherwise check the server log.</p></>);
    if (!m)
        notFound();
    const msg = m;
    const { data: reps, error: repErr } = await sb.from("message_replies").select("id,body,delivery,created_at").eq("message_id", id).order("created_at", { ascending: true });
    if (repErr)
        console.error("[messages] replies load failed:", repErr.code, repErr.message);
    const replies = (reps ?? []);
    const subject = msg.subject || "(no subject)";
    const mailto = (r) => `mailto:${encodeURIComponent(msg.email).replace(/%40/g, "@")}?subject=${encodeURIComponent(`Re: ${msg.subject || "Your message to EUROPIUM"}`)}&body=${encodeURIComponent(r.body.slice(0, 1500))}`;
    return (<>
    <p className="mb-2 text-sm"><Link href="/admin/messages" className="underline underline-offset-4">← All messages</Link></p>
    <h1 className="mb-4 break-words font-serif text-3xl md:text-4xl">{subject}</h1>
    <Flash ok={sp.ok} error={sp.error}/>
    {repErr && <p role="alert" className="mb-6 border border-red-800 px-4 py-3 text-sm text-red-800">The conversation history could not be loaded. Replies are not set up until migration <code>0014_reviews_messages.sql</code> is run.</p>}

    <dl className="mb-6 grid max-w-3xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      <dt className="text-taupe">From</dt><dd>{msg.name}</dd>
      <dt className="text-taupe">Email</dt><dd className="break-all"><a href={`mailto:${msg.email}`} className="underline underline-offset-4">{msg.email}</a></dd>
      <dt className="text-taupe">Received</dt><dd>{when(msg.created_at)}</dd>
      <dt className="text-taupe">Status</dt><dd><span className={`border px-2 py-0.5 text-xs uppercase tracking-[0.12em] ${BADGE[msg.status]}`}>{LABEL[msg.status]}</span>{msg.replied_at && <span className="ml-2 text-xs text-taupe">last replied {when(msg.replied_at)}</span>}</dd>
    </dl>

    <section aria-label="Conversation" className="mb-8 max-w-3xl space-y-4">
      <article className="border border-sand p-4"><p className="mb-2 text-xs uppercase tracking-[0.12em] text-taupe">{msg.name} · original message</p><p className="whitespace-pre-line break-words text-sm">{msg.message}</p></article>
      {replies.map((r) => (<article key={r.id} className="ml-4 border border-sand bg-cream p-4 sm:ml-10">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-taupe">Your reply · {when(r.created_at)} · {r.delivery === "sent" ? "emailed" : r.delivery === "failed" ? "email failed" : "saved, not emailed"}</p>
          <p className="whitespace-pre-line break-words text-sm">{r.body}</p>
          {r.delivery !== "sent" && <p className="mt-3 text-xs"><a href={mailto(r)} className="underline underline-offset-4">Email this reply</a> <span className="text-taupe">(opens your mail app)</span></p>}
        </article>))}
    </section>

    <form action={reply} className="mb-8 max-w-3xl space-y-3">
      <input type="hidden" name="id" value={msg.id}/>
      <label htmlFor="body" className="block text-sm font-medium">Reply</label>
      <textarea id="body" name="body" rows={6} required maxLength={5000} className="w-full border border-sand bg-transparent p-3"/>
      <p className="text-xs text-taupe">The reply is added to the conversation and the original message is kept. No email provider is configured yet, so nothing is emailed automatically.</p>
      <SubmitButton pending="Saving reply…">Save reply</SubmitButton>
    </form>

    <div className="flex max-w-3xl flex-wrap gap-2 border-t border-sand pt-4">
      {msg.status !== "read" && <form action={setStatus}><input type="hidden" name="id" value={msg.id}/><input type="hidden" name="op" value="read"/><button className="btn-line min-h-11 px-4">Mark read</button></form>}
      {msg.status !== "unread" && <form action={setStatus}><input type="hidden" name="id" value={msg.id}/><input type="hidden" name="op" value="unread"/><button className="btn-line min-h-11 px-4">Mark unread</button></form>}
      <form action={remove}><input type="hidden" name="id" value={msg.id}/><ConfirmSubmit message="Delete this message and its replies permanently? This cannot be undone." className="btn-line min-h-11 px-4 text-red-800">Delete</ConfirmSubmit></form>
    </div>
  </>);
}
