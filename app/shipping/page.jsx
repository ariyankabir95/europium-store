import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
    title: "Shipping & Delivery",
    description: "How EUROPIUM prepares, ships and delivers your order.",
};

const steps = [
    { number: "01", title: "Order placed", body: "We receive your order details and begin preparing it for processing." },
    { number: "02", title: "Packed with care", body: "Your pieces are checked and packed before they leave us." },
    { number: "03", title: "On the way", body: "Once the order is shipped, its status will be updated in your account." },
];

export default function ShippingPage() {
    return (
        <Page title="Shipping, without the guesswork." intro="The essentials for getting your EUROPIUM order from our store to your door.">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="border border-sand bg-cream p-6 md:p-9">
                    <p className="text-xs uppercase tracking-[0.22em] text-taupe">Delivery guide / 01</p>
                    <h2 className="mt-4 max-w-xl font-display text-3xl md:text-5xl">Good things are worth tracking.</h2>
                    <p className="mt-4 max-w-xl leading-7 text-umber">Delivery timing can vary by destination, courier and product availability. Any available delivery estimate and shipping charge will be shown during checkout or confirmed by our team before dispatch.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/account" className="btn-dark">View my orders</Link>
                        <Link href="/contact" className="border border-sand px-5 py-3 text-sm hover:bg-white">Ask a question</Link>
                    </div>
                </section>
                <aside className="flex flex-col justify-between border border-sand p-6 md:p-8">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-taupe">Before checkout</p>
                        <h2 className="mt-3 font-serif text-2xl">A quick checklist</h2>
                    </div>
                    <ul className="mt-6 space-y-5 text-sm leading-6 text-umber">
                        <li className="flex gap-3"><span className="text-taupe">01</span><span>Double-check your phone number and full delivery address.</span></li>
                        <li className="flex gap-3"><span className="text-taupe">02</span><span>Review the shipping charge and payment instructions shown at checkout.</span></li>
                        <li className="flex gap-3"><span className="text-taupe">03</span><span>Sign in to check your order status after placing your order.</span></li>
                    </ul>
                </aside>
            </div>
            <section className="mt-14 md:mt-20">
                <div className="mb-7 flex items-end justify-between gap-4">
                    <div><p className="text-xs uppercase tracking-[0.22em] text-taupe">From us to you</p><h2 className="mt-2 font-display text-3xl md:text-4xl">The journey</h2></div>
                    <span className="hidden text-sm text-taupe sm:block">Simple steps. Clear updates.</span>
                </div>
                <div className="grid gap-px border border-sand bg-sand md:grid-cols-3">
                    {steps.map((step) => <article key={step.number} className="bg-warm p-6 md:p-7"><span className="font-display text-4xl text-taupe">{step.number}</span><h3 className="mt-5 font-serif text-xl">{step.title}</h3><p className="mt-3 text-sm leading-6 text-umber">{step.body}</p></article>)}
                </div>
            </section>
            <section className="mt-10 border-t border-sand pt-7">
                <h2 className="font-serif text-xl">Need help with a delivery?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-umber">Please include your order number when contacting us so we can find the right details faster.</p>
                <Link href="/contact" className="mt-4 inline-flex text-sm underline underline-offset-4">Contact EUROPIUM</Link>
            </section>
        </Page>
    );
}
