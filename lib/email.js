import "server-only";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isEmail } from "@/lib/validate";
import { claimOrderEmail, markOrderEmailSent, releaseOrderEmailClaim, } from "@/lib/email-events";
import * as T from "@/lib/email-templates";
export async function sendEmail(input) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey)
        return { ok: false, error: "RESEND_API_KEY is not configured." };
    if (!from)
        return { ok: false, error: "EMAIL_FROM is not configured." };
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
    });
    if (error || !data?.id) {
        return { ok: false, error: error?.message || "Resend did not return an email id." };
    }
    return { ok: true, id: data.id };
}
/** Absolute URL for a path on this site, or null when NEXT_PUBLIC_SITE_URL is not set. */
export function siteUrl(path) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
    return base ? `${base}${path}` : null;
}
const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
const serviceRoleConfigured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
async function loadOrder(orderId) {
    const { data, error } = await supabaseAdmin()
        .from("orders")
        .select("id,email,status,payment_method,payment_reference,tracking_number,subtotal_cents,discount_cents,shipping_cents,total_cents,created_at,shipping_address,coupons(code),order_items(name,unit_price_cents,quantity)")
        .eq("id", orderId)
        .maybeSingle();
    if (error || !data) {
        console.error("[email] order not loaded", orderId, error?.code ?? "not found");
        return null;
    }
    const o = data;
    const coupon = Array.isArray(o.coupons) ? o.coupons[0] : o.coupons;
    const name = [o.shipping_address?.first_name, o.shipping_address?.last_name].filter(Boolean).join(" ").trim();
    return {
        to: o.email,
        view: {
            shortId: o.id.slice(0, 8),
            placedAt: new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            customerName: name || "Europium customer",
            items: o.order_items.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                lineTotal: (i.unit_price_cents * i.quantity) / 100,
            })),
            subtotal: o.subtotal_cents / 100,
            discount: o.discount_cents / 100,
            shipping: o.shipping_cents / 100,
            total: o.total_cents / 100,
            couponCode: coupon?.code ?? null,
            paymentMethod: o.payment_method,
            paymentReference: o.payment_reference,
            trackingNumber: o.tracking_number,
            orderUrl: siteUrl(`/account/orders/${o.id}`),
            supportUrl: siteUrl("/account/support"),
        },
    };
}
/**
 * Shared path for every order email: check configuration, load the order, claim the event (duplicate guard),
 * send, then record or release the claim. Never throws.
 */
async function sendOrderEmailOnce(orderId, type, build) {
    let claimed = false;
    try {
        if (!emailConfigured() || !serviceRoleConfigured()) {
            console.warn("[email] skipped", type, "- email or Supabase service role is not configured");
            return;
        }
        const order = await loadOrder(orderId);
        if (!order)
            return;
        claimed = await claimOrderEmail(orderId, type);
        if (!claimed)
            return; // already sent, or claimed by another request
        const rendered = build(order.view);
        const result = await sendEmail({ to: order.to, ...rendered });
        if (result.ok) {
            claimed = false;
            await markOrderEmailSent(orderId, type, result.id);
        }
        else {
            console.error("[email] send failed", type, orderId, result.error);
        }
    }
    catch (err) {
        console.error("[email] unexpected error", type, orderId, err instanceof Error ? err.name : "unknown");
    }
    finally {
        if (claimed)
            await releaseOrderEmailClaim(orderId, type).catch(() => undefined);
    }
}
/** Sent once, right after an order is successfully created. */
export function sendOrderPlacedEmail(orderId) {
    return sendOrderEmailOnce(orderId, "order_placed", T.orderPlacedEmail);
}
/** Sent once, when payment_status becomes paid. */
export function sendPaymentReceivedEmail(orderId) {
    return sendOrderEmailOnce(orderId, "payment_received", T.paymentReceivedEmail);
}
const STATUS_EVENT = {
    confirmed: "order_confirmed",
    processing: "order_processing",
    shipped: "order_shipped",
    delivered: "order_delivered",
    cancelled: "order_cancelled",
    refunded: "order_refunded",
};
/** Sent once per status when the status really changes. "pending" has no customer email. */
export function sendOrderStatusEmail(orderId, status) {
    if (!Object.prototype.hasOwnProperty.call(STATUS_EVENT, status))
        return Promise.resolve();
    const key = status;
    return sendOrderEmailOnce(orderId, STATUS_EVENT[key], (view) => T.orderStatusEmail(key, view));
}
// ─────────────────────────── Support ───────────────────────────
/** Admin notifications go to the store contact email set in Admin → Settings. */
async function adminRecipient() {
    const { data } = await supabaseAdmin().from("site_settings").select("value").eq("key", "general").maybeSingle();
    const value = (data?.value ?? {});
    const address = typeof value.contact_email === "string" ? value.contact_email.trim() : "";
    return isEmail(address) ? address : null;
}
async function loadConversation(conversationId) {
    const admin = supabaseAdmin();
    const { data: conv } = await admin
        .from("support_conversations")
        .select("id,user_id,order_id,subject")
        .eq("id", conversationId)
        .maybeSingle();
    if (!conv)
        return null;
    const [{ data: latest }, { data: profile }, customer] = await Promise.all([
        admin
            .from("support_messages")
            .select("body")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        admin.from("profiles").select("full_name").eq("id", conv.user_id).maybeSingle(),
        admin.auth.admin.getUserById(conv.user_id),
    ]);
    return {
        id: conv.id,
        orderId: conv.order_id ?? null,
        subject: conv.subject,
        latestBody: latest?.body ?? "",
        customerName: profile?.full_name?.trim() || "Europium customer",
        customerEmail: customer.data?.user?.email ?? null,
    };
}
/**
 * Admin notification when a customer opens a ticket or replies. Returns true only if it was sent.
 * Never throws. Each call follows one successful database write, so a failed write never reaches this point.
 */
export async function sendSupportNotificationEmail(input) {
    try {
        if (!emailConfigured() || !serviceRoleConfigured()) {
            console.warn("[support-email] skipped - email not configured");
            return false;
        }
        const to = await adminRecipient();
        if (!to) {
            console.warn("[support-email] skipped - no contact email set in Admin → Settings");
            return false;
        }
        const conv = await loadConversation(input.conversationId);
        if (!conv)
            return false;
        const rendered = T.supportAdminNotificationEmail({
            kind: input.kind,
            customerName: conv.customerName,
            customerEmail: conv.customerEmail ?? "unknown",
            subject: conv.subject,
            orderShortId: conv.orderId ? conv.orderId.slice(0, 8) : null,
            latestMessage: conv.latestBody,
            adminUrl: siteUrl(`/admin/support/${conv.id}`),
        });
        const result = await sendEmail({ to, ...rendered });
        if (!result.ok)
            console.error("[support-email] admin notification failed:", result.error);
        return result.ok;
    }
    catch (err) {
        console.error("[support-email] unexpected error", err instanceof Error ? err.name : "unknown");
        return false;
    }
}
/** Customer notification when Europium Support replies. Returns true only if it was sent. Never throws. */
export async function sendSupportReplyEmail(input) {
    try {
        if (!emailConfigured() || !serviceRoleConfigured()) {
            console.warn("[support-email] skipped - email not configured");
            return false;
        }
        const conv = await loadConversation(input.conversationId);
        if (!conv)
            return false;
        if (!conv.customerEmail) {
            console.warn("[support-email] skipped - customer has no email address");
            return false;
        }
        const rendered = T.supportCustomerReplyEmail({
            subject: conv.subject,
            latestReply: conv.latestBody,
            customerName: conv.customerName,
            supportUrl: siteUrl(`/account/support/${conv.id}`),
        });
        const result = await sendEmail({ to: conv.customerEmail, ...rendered });
        if (!result.ok)
            console.error("[support-email] customer reply email failed:", result.error);
        return result.ok;
    }
    catch (err) {
        console.error("[support-email] unexpected error", err instanceof Error ? err.name : "unknown");
        return false;
    }
}
