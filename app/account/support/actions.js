"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { str, uuid } from "@/lib/admin";
import { sendSupportNotificationEmail } from "@/lib/email";
import { supportErrorMessage } from "@/lib/support";
import { consumeRateLimit } from "@/lib/rate-limit";
// Customer support writes. Every change goes through the database functions, which check ownership and state.
// Notification emails run only after a successful write and never fail the request.
const toNew = (msg) => redirect(`/account/support/new?error=${encodeURIComponent(msg)}`);
export async function createSupportTicket(fd) {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user)
        redirect("/login?next=/account/support/new");
    const limited = await consumeRateLimit({ headers: await headers() }, "support-open", { limit: 3, windowSeconds: 3600, identifier: user.id });
    if (limited.unavailable) toNew("Support is temporarily unavailable. Please try again shortly.");
    if (!limited.allowed) toNew("You have sent several support requests recently. Please wait before opening another.");
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
    const limited = await consumeRateLimit({ headers: await headers() }, "support-reply", { limit: 10, windowSeconds: 3600, identifier: user.id });
    if (limited.unavailable) redirect("/account/support?error=Support%20is%20temporarily%20unavailable.%20Please%20try%20again.");
    if (!limited.allowed) redirect("/account/support?error=Too%20many%20replies.%20Please%20wait%20before%20sending%20another.");
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
