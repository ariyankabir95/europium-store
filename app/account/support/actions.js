"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { str, uuid } from "@/lib/admin";
import { sendSupportNotificationEmail } from "@/lib/email";
import { supportErrorMessage } from "@/lib/support";
// Customer support writes. Every change goes through the database functions, which check ownership and state.
// Notification emails run only after a successful write and never fail the request.
const toNew = (msg) => redirect(`/account/support/new?error=${encodeURIComponent(msg)}`);
export async function createSupportTicket(fd) {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/support/new");
    const subject = str(fd, "subject", 200);
    const body = str(fd, "body", 5000);
    const orderRaw = str(fd, "order_id", 40);
    const orderId = uuid(orderRaw) ? orderRaw : null;
    if (!subject || !body)
        toNew("Please add a subject and a message.");
    const { data, error } = await sb.rpc("support_open_conversation", { p_subject: subject, p_order: orderId, p_body: body });
    if (error || !data) {
        console.error("[support] open failed:", error?.code, error?.message);
        toNew(supportErrorMessage(error));
    }
    await sendSupportNotificationEmail({ conversationId: data, kind: "new_request" });
    revalidatePath("/account/support");
    redirect(`/account/support/${data}`);
}
export async function replyToSupport(fd) {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/support");
    const id = str(fd, "conversation_id", 40);
    if (!uuid(id))
        redirect("/account/support");
    const back = (msg) => redirect(`/account/support/${id}?error=${encodeURIComponent(msg)}`);
    const body = str(fd, "body", 5000);
    if (!body)
        back("Please write a message before sending.");
    const { error } = await sb.rpc("support_post_message", { p_conversation: id, p_body: body });
    if (error) {
        console.error("[support] reply failed:", error.code, error.message);
        back(supportErrorMessage(error));
    }
    await sendSupportNotificationEmail({ conversationId: id, kind: "customer_reply" });
    revalidatePath(`/account/support/${id}`);
    revalidatePath("/account/support");
    redirect(`/account/support/${id}`);
}
