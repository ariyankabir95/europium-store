"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, uuid } from "@/lib/admin";
import { back } from "@/lib/cms-admin";
import { sendSupportReplyEmail } from "@/lib/email";
import { SUPPORT_STATUSES, supportErrorMessage } from "@/lib/support";
// Admin support writes. Authorization: requireAdmin() here, plus the is_admin() checks inside the database functions.
const here = (id) => `/admin/support/${id}`;
export async function replyAsSupport(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "conversation_id", 40);
    if (!uuid(id))
        back("/admin/support", "error", "Invalid request.");
    const body = str(fd, "body", 5000);
    if (!body)
        back(here(id), "error", "Write a reply first.");
    const { error } = await sb.rpc("support_post_message", { p_conversation: id, p_body: body });
    if (error) {
        console.error("[support] admin reply failed:", error.code, error.message);
        back(here(id), "error", supportErrorMessage(error));
    }
    // The reply is already saved. An email failure is reported, but it does not undo or fail the reply.
    const sent = await sendSupportReplyEmail({ conversationId: id });
    revalidatePath("/admin/support");
    revalidatePath(here(id));
    if (sent)
        back(here(id), "ok", "Reply sent. The customer has been notified by email.");
    back(here(id), "error", "Reply saved to the conversation, but the customer email could not be sent. Check the email settings and the server log.");
}
export async function setSupportStatus(fd) {
    const sb = await requireAdmin();
    const id = str(fd, "conversation_id", 40);
    const status = str(fd, "status", 20);
    if (!uuid(id) || !SUPPORT_STATUSES.includes(status))
        back("/admin/support", "error", "Invalid request.");
    const { error } = await sb.rpc("support_set_status", { p_conversation: id, p_status: status });
    if (error) {
        console.error("[support] status change failed:", error.code, error.message);
        back(here(id), "error", "The status could not be changed. Please try again.");
    }
    revalidatePath("/admin/support");
    revalidatePath(here(id));
    back(here(id), "ok", `Status changed to ${status}.`);
}
