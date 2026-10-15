import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
    title: "Returns & Exchanges",
    description: "What to do if your EUROPIUM order is not quite right.",
};

const requirements = [
    ["Keep it in original condition", "Items should be unworn, unwashed and returned with original tags and packaging."],
    ["Contact us first", "Tell us your order number and what went wrong before sending anything back."],
    ["Share clear details", "For a wrong, damaged or faulty item, include clear photos so we can review the issue."],
];

export default function ReturnsPage() {
    return (
        <Page title="Not quite right? Let's sort it." intro="Getting the right fit matters. If something about your order isn't as expected, start here.">
            <section className="grid gap-0 border border-sand md:grid-cols-[0.8fr_1.2fr]">
                <div className="bg-cream p-6 md:p-9">
                    <p className="text-xs uppercase tracking-[0.22em] text-taupe">Returns / Exchanges</p>
                    <h2 className="mt-4 font-display text-3xl md:text-5xl">Start with a conversation.</h2>
                    <p className="mt-4 text-sm leading-6 text-umber">Please contact us before sending an item back. We’ll review the order details and explain the next steps for your case.</p>
                    <Link href="/contact" className="btn-dark mt-7 inline-flex">Request help</Link>
                </div>
                <div className="p-6 md:p-9">
                    <h2 className="font-serif text-2xl">To help us help you</h2>
                    <div className="mt-6 space-y-6">
                        {requirements.map(([title, body], i) => <div key={title} className="flex gap-4 border-b border-sand pb-5 last:border-0"><span className="font-display text-2xl text-taupe">0{i + 1}</span><div><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-umber">{body}</p></div></div>)}
                    </div>
                </div>
            </section>
            <section className="mt-12 grid gap-6 md:grid-cols-2">
                <article className="border border-sand p-6"><h2 className="font-serif text-xl">Wrong or damaged item?</h2><p className="mt-3 text-sm leading-6 text-umber">Please get in touch as soon as possible after delivery, with your order number and photos of the issue. We’ll review it and let you know what can be done.</p></article>
                <article className="border border-sand p-6"><h2 className="font-serif text-xl">Refunds</h2><p className="mt-3 text-sm leading-6 text-umber">If a refund is approved, we’ll confirm the amount and available refund method with you. Processing time can depend on the payment method.</p></article>
            </section>
            <p className="mt-8 border-l-2 border-taupe pl-4 text-sm leading-6 text-umber">Return eligibility, timing and any applicable delivery costs must be confirmed with our team before an item is sent back. Please don’t ship a return without receiving instructions.</p>
        </Page>
    );
}
