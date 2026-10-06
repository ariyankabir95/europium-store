// Shared support helpers for the customer and admin screens. Pure functions only: no database or secret access.
export const SUPPORT_STATUSES = ["open", "pending", "resolved", "closed"];
/** "Pending" means waiting on the other side. For a customer that is "Awaiting your reply". */
export function statusLabel(status, viewer) {
    if (status === "pending")
        return viewer === "customer" ? "Awaiting your reply" : "Pending";
    return { open: "Open", pending: "Pending", resolved: "Resolved", closed: "Closed" }[status];
}
export const STATUS_BADGE = {
    open: "border-charcoal bg-charcoal text-warm",
    pending: "border-taupe text-charcoal",
    resolved: "border-sand text-umber",
    closed: "border-sand text-taupe",
};
/** Unread = the other side posted after this side last opened the conversation. */
export function isUnreadForCustomer(c) {
    return c.last_message_sender === "admin" && (!c.customer_read_at || c.customer_read_at < c.last_message_at);
}
export function isUnreadForAdmin(c) {
    return c.last_message_sender === "customer" && (!c.admin_read_at || c.admin_read_at < c.last_message_at);
}
export const shortOrderId = (id) => (id ? `#${id.slice(0, 8)}` : null);
export function formatWhen(iso) {
    return iso
        ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "";
}
/** Maps database errors from the support functions to messages that are safe to show a customer or admin. */
export function supportErrorMessage(error) {
    const m = error?.message ?? "";
    if (m.includes("conversation_closed"))
        return "This conversation is closed. Please start a new request if you still need help.";
    if (m.includes("invalid_subject"))
        return "Please enter a subject (up to 200 characters).";
    if (m.includes("invalid_body"))
        return "Please write a message (up to 5000 characters).";
    if (m.includes("invalid_order"))
        return "That order is not on your account. Choose one of your orders, or leave it blank.";
    if (m.includes("not_found"))
        return "This conversation could not be found.";
    if (m.includes("not authenticated"))
        return "Please sign in again to continue.";
    return "Something went wrong and your message was not sent. Please try again.";
}
