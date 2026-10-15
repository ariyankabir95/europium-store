import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
    title: "Frequently Asked Questions",
    description: "Quick answers about ordering, payment, delivery and EUROPIUM products.",
};

const groups = [
    {
        label: "Orders",
        items: [
            ["How can I check my order status?", <>Sign in and open your <Link className="underline underline-offset-4" href="/account">account</Link> to view your orders and their current status.</>],
            ["Can I change my order after placing it?", "Contact us as soon as possible with your order number. Changes may not be possible once an order is being processed or shipped."],
            ["I haven't received an update. What should I do?", "Check your account first, then contact us with your order number if you need help."],
        ],
    },
    {
        label: "Payment & delivery",
        items: [
            ["Where can I see the shipping cost?", "Review the shipping details shown during checkout or confirmed by our team before dispatch."],
            ["Which payment methods are available?", "Available payment methods and any instructions are shown during checkout. Follow the instructions displayed for your specific order."],
            ["Do you send SMS or email updates?", "Automated SMS and email notifications are not currently part of the service. Please check your account for order status."],
        ],
    },
    {
        label: "Products & returns",
        items: [
            ["How do I choose a size?", "Review the size information on the product page. If you're between sizes or unsure, contact us before ordering."],
            ["Can I return or exchange an item?", <>Please read our <Link className="underline underline-offset-4" href="/returns">Returns & Exchanges</Link> page and contact us before sending an item back.</>],
            ["What if my item arrives damaged or incorrect?", "Contact us as soon as possible with your order number and clear photos, and we’ll review the issue."],
        ],
    },
];

export default function FAQPage() {
    return (
        <Page title="A few things, answered." intro="Quick, clear answers so you can shop EUROPIUM with confidence.">
            <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr]">
                <aside className="h-fit bg-cream p-6 md:p-8">
                    <p className="text-xs uppercase tracking-[0.22em] text-taupe">Help desk / FAQ</p>
                    <h2 className="mt-4 font-display text-3xl">Need a human?</h2>
                    <p className="mt-3 text-sm leading-6 text-umber">If your question isn't covered here, send us a message and include your order number if you have one.</p>
                    <Link href="/contact" className="btn-dark mt-6 inline-flex">Contact us</Link>
                </aside>
                <div className="space-y-10">
                    {groups.map((group, index) => <section key={group.label}>
                        <div className="mb-3 flex items-center gap-3"><span className="font-display text-2xl text-taupe">0{index + 1}</span><h2 className="font-serif text-2xl">{group.label}</h2></div>
                        <div className="border-t border-sand">
                            {group.items.map(([question, answer]) => <details key={question} className="group border-b border-sand py-5">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none">{question}<span aria-hidden="true" className="text-xl text-taupe transition-transform group-open:rotate-45">+</span></summary>
                                <div className="max-w-2xl pt-3 text-sm leading-7 text-umber">{answer}</div>
                            </details>)}
                        </div>
                    </section>)}
                </div>
            </div>
        </Page>
    );
}
