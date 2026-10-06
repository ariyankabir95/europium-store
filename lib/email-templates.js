// Pure rendering only: no network, no database, no secrets. Safe to unit-test.
// Every value taken from a customer, order or admin field is HTML-escaped before it reaches the markup.
import { money } from "@/lib/format";
const COLOR = {
    page: "#F6F2EC",
    surface: "#FFFDF9",
    border: "#E4DACB",
    ink: "#141414",
    muted: "#6F6253",
    button: "#141414",
    buttonText: "#FFFDF9",
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";
export function esc(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
const bdt = (amount) => money(amount, "BDT");
const PAYMENT_LABEL = { bkash_manual: "bKash (manual transfer)" };
const paymentLabel = (method) => PAYMENT_LABEL[method] ?? method;
/** Shared outer shell: warm off-white canvas, black wordmark, minimal footer. Mobile friendly (single column, max 600px). */
function layout(preheader, innerHtml) {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLOR.page};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${COLOR.surface};border:1px solid ${COLOR.border};">
<tr><td style="padding:32px 36px 20px;border-bottom:1px solid ${COLOR.border};text-align:center;">
<span style="font-family:${SERIF};font-size:22px;letter-spacing:6px;color:${COLOR.ink};">EUROPIUM</span>
</td></tr>
<tr><td style="padding:36px;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLOR.ink};">${innerHtml}</td></tr>
<tr><td style="padding:24px 36px 32px;border-top:1px solid ${COLOR.border};font-family:${SANS};font-size:12px;line-height:1.6;color:${COLOR.muted};text-align:center;">
Europium · Premium men's fashion<br>This is an automated message about your account. Please do not reply to this email.
</td></tr>
</table></td></tr></table></body></html>`;
}
function heading(text) {
    return `<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:normal;font-size:26px;line-height:1.3;color:${COLOR.ink};">${esc(text)}</h1>`;
}
function para(text) {
    return `<p style="margin:0 0 16px;">${esc(text)}</p>`;
}
function button(label, url) {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;"><tr><td style="background:${COLOR.button};">
<a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${COLOR.buttonText};text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;
}
function quoteBox(text) {
    return `<div style="margin:16px 0 24px;padding:16px 18px;background:${COLOR.page};border-left:2px solid ${COLOR.muted};white-space:pre-line;word-break:break-word;">${esc(text)}</div>`;
}
function kvRows(rows) {
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 8px;font-size:14px;">${rows
        .map(([k, v]) => `<tr><td style="padding:6px 0;color:${COLOR.muted};width:40%;">${esc(k)}</td><td style="padding:6px 0;text-align:right;">${esc(v)}</td></tr>`)
        .join("")}</table>`;
}
function itemsTable(items) {
    const rows = items
        .map((i) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${COLOR.border};">${esc(i.name)}<br><span style="color:${COLOR.muted};font-size:13px;">Qty ${i.quantity}</span></td><td style="padding:12px 0;border-bottom:1px solid ${COLOR.border};text-align:right;vertical-align:top;">${esc(bdt(i.lineTotal))}</td></tr>`)
        .join("");
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 16px;font-size:14px;">${rows}</table>`;
}
function totalsHtml(d) {
    const rows = [["Subtotal", bdt(d.subtotal)]];
    if (d.discount > 0)
        rows.push([d.couponCode ? `Discount (${d.couponCode})` : "Discount", `-${bdt(d.discount)}`]);
    rows.push(["Shipping", d.shipping > 0 ? bdt(d.shipping) : "Free"]);
    return (kvRows(rows) +
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-top:1px solid ${COLOR.ink};font-size:16px;"><tr><td style="padding:12px 0 0;">Total</td><td style="padding:12px 0 0;text-align:right;">${esc(bdt(d.total))}</td></tr></table>`);
}
function totalsText(d) {
    const lines = [`Subtotal: ${bdt(d.subtotal)}`];
    if (d.discount > 0)
        lines.push(`Discount${d.couponCode ? ` (${d.couponCode})` : ""}: -${bdt(d.discount)}`);
    lines.push(`Shipping: ${d.shipping > 0 ? bdt(d.shipping) : "Free"}`, `Total: ${bdt(d.total)}`);
    return lines;
}
function orderSummaryText(d) {
    return [
        `Order #${d.shortId} · placed ${d.placedAt}`,
        "",
        ...d.items.map((i) => `- ${i.name} × ${i.quantity}: ${bdt(i.lineTotal)}`),
        "",
        ...totalsText(d),
        `Payment: ${paymentLabel(d.paymentMethod)}${d.paymentReference ? ` · Transaction ID: ${d.paymentReference}` : ""}`,
    ];
}
function orderSummaryHtml(d) {
    return `<p style="margin:24px 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLOR.muted};">Order #${esc(d.shortId)} · ${esc(d.placedAt)}</p>${itemsTable(d.items)}${totalsHtml(d)}${kvRows([
        ["Payment", paymentLabel(d.paymentMethod)],
        ...(d.paymentReference ? [["Transaction ID", d.paymentReference]] : []),
    ])}`;
}
function footerLinks(d) {
    const html = d.supportUrl ? para("Questions about your order? Reply through our support page, and we will get back to you.") : "";
    return { html, text: d.supportUrl ? ["", `Questions? Contact us at: ${d.supportUrl}`] : [] };
}
// ─────────────── Customer: order placed ───────────────
export function orderPlacedEmail(d) {
    const subject = `Thank you for your Europium order #${d.shortId}`;
    const html = layout(`We have received your order #${d.shortId}.`, heading(`Thank you, ${d.customerName}.`) +
        para("We have received your order and it is now waiting for payment verification. We will confirm it as soon as your bKash transaction is checked.") +
        orderSummaryHtml(d) +
        (d.orderUrl ? button("View your order", d.orderUrl) : "") +
        footerLinks(d).html);
    const text = [
        `Thank you, ${d.customerName}.`,
        "",
        "We have received your order and it is now waiting for payment verification. We will confirm it as soon as your bKash transaction is checked.",
        "",
        ...orderSummaryText(d),
        ...(d.orderUrl ? ["", `View your order: ${d.orderUrl}`] : []),
        ...footerLinks(d).text,
    ];
    return { subject, html, text: text.join("\n") };
}
// ─────────────── Customer: payment received ───────────────
export function paymentReceivedEmail(d) {
    const subject = `Payment received for your Europium order #${d.shortId}`;
    const html = layout(`Payment received for order #${d.shortId}.`, heading("Payment received") +
        para(`Hello ${d.customerName}, we have verified your payment of ${bdt(d.total)} for order #${d.shortId}.`) +
        kvRows([
            ["Amount", bdt(d.total)],
            ["Payment method", paymentLabel(d.paymentMethod)],
            ["Transaction ID", d.paymentReference ?? "Not provided"],
            ["Order", `#${d.shortId}`],
        ]) +
        (d.orderUrl ? button("View your order", d.orderUrl) : ""));
    const text = [
        `Hello ${d.customerName},`,
        "",
        `We have verified your payment of ${bdt(d.total)} for order #${d.shortId}.`,
        "",
        `Amount: ${bdt(d.total)}`,
        `Payment method: ${paymentLabel(d.paymentMethod)}`,
        `Transaction ID: ${d.paymentReference ?? "Not provided"}`,
        `Order: #${d.shortId}`,
        ...(d.orderUrl ? ["", `View your order: ${d.orderUrl}`] : []),
    ];
    return { subject, html, text: text.join("\n") };
}
// ─────────────── Customer: order status ───────────────
const STATUS_COPY = {
    confirmed: {
        subject: "Your Europium order has been confirmed.",
        heading: "Your order is confirmed",
        body: "Thank you. Your payment has been checked and your order is confirmed.",
        cta: "View your order",
    },
    processing: {
        subject: "Your Europium order is now being prepared.",
        heading: "Your order is being prepared",
        body: "Our team is now preparing your order for dispatch.",
        cta: "View your order",
    },
    shipped: {
        subject: "Your Europium order has been shipped.",
        heading: "Your order is on its way",
        body: "Your order has left our studio and has been shipped.",
        cta: "Track your order",
    },
    delivered: {
        subject: "Your Europium order has been delivered.",
        heading: "Your order has been delivered",
        body: "Your order has been delivered. We hope you love it.",
        cta: "View your order",
    },
    cancelled: {
        subject: "Your Europium order has been cancelled.",
        heading: "Your order has been cancelled",
        body: "Your order has been cancelled. If you did not request this, or have questions, please contact us.",
        cta: "View your order",
    },
    refunded: {
        subject: "Your Europium order has been refunded.",
        heading: "Your order has been refunded",
        body: "A refund has been issued for your order. Please allow your payment provider some time to process it.",
        cta: "View your order",
    },
};
export function orderStatusEmail(status, d) {
    const c = STATUS_COPY[status];
    const tracking = status === "shipped" && d.trackingNumber ? [["Tracking number", d.trackingNumber]] : [];
    const html = layout(`${c.heading} · order #${d.shortId}`, heading(c.heading) +
        para(`Hello ${d.customerName},`) +
        para(c.body) +
        (tracking.length ? kvRows(tracking) : "") +
        kvRows([["Order", `#${d.shortId}`]]) +
        (d.orderUrl ? button(c.cta, d.orderUrl) : "") +
        footerLinks(d).html);
    const text = [
        `Hello ${d.customerName},`,
        "",
        c.body,
        "",
        `Order: #${d.shortId}`,
        ...(tracking.length ? [`Tracking number: ${d.trackingNumber}`] : []),
        ...(d.orderUrl ? ["", `${c.cta}: ${d.orderUrl}`] : []),
        ...footerLinks(d).text,
    ];
    return { subject: c.subject, html, text: text.join("\n") };
}
export function supportAdminNotificationEmail(d) {
    const subject = d.kind === "new_request" ? "New customer support request" : "Customer replied to a support conversation";
    const preview = d.latestMessage.length > 500 ? `${d.latestMessage.slice(0, 500)}…` : d.latestMessage;
    const rows = [
        ["Customer", d.customerName],
        ["Email", d.customerEmail],
        ["Subject", d.subject],
        ["Order", d.orderShortId ? `#${d.orderShortId}` : "Not linked"],
    ];
    const html = layout(`${subject}: ${d.subject}`, heading(subject) +
        kvRows(rows) +
        `<p style="margin:20px 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLOR.muted};">Message preview</p>` +
        quoteBox(preview) +
        (d.adminUrl ? button("Open in admin support", d.adminUrl) : ""));
    const text = [
        subject,
        "",
        `Customer: ${d.customerName} <${d.customerEmail}>`,
        `Subject: ${d.subject}`,
        `Order: ${d.orderShortId ? `#${d.orderShortId}` : "Not linked"}`,
        "",
        "Message preview:",
        preview,
        ...(d.adminUrl ? ["", `Open in admin support: ${d.adminUrl}`] : []),
    ];
    return { subject, html, text: text.join("\n") };
}
export function supportCustomerReplyEmail(d) {
    const subject = "Europium Support replied to your request";
    const html = layout(`Europium Support replied: ${d.subject}`, heading("Europium Support replied") +
        para(`Hello ${d.customerName}, we have replied to your request “${d.subject}”.`) +
        quoteBox(d.latestReply) +
        (d.supportUrl ? button("View the conversation", d.supportUrl) : ""));
    const text = [
        `Hello ${d.customerName},`,
        "",
        `We have replied to your request "${d.subject}":`,
        "",
        d.latestReply,
        ...(d.supportUrl ? ["", `View the conversation: ${d.supportUrl}`] : []),
    ];
    return { subject, html, text: text.join("\n") };
}
