import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
    title: "Shipping & Delivery",
    description: "EUROPIUM delivery areas, shipping charges and order tracking.",
};

const steps = [
    { number: "01", title: "Order placed", body: "We receive your order details and begin preparing it for processing." },
    { number: "02", title: "Packed with care", body: "Your pieces are checked and packed before they leave us." },
    { number: "03", title: "On the way", body: "Once the order is shipped, its status will be updated in your account." },
];

const deliveryAreas = [
    { name: "Savar EPZ & nearby", fee: "৳50" },
    { name: "Bypail & Ashulia", fee: "৳70" },
    { name: "Other selected Savar areas", fee: "৳100" },
];

export default function ShippingPage() {
    return (
        <Page title="Shipping, without the guesswork." intro="The essentials for getting your EUROPIUM order from our store to your door.">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="border border-sand bg-cream p-6 md:p-9">
                    <p className="text-xs uppercase tracking-[0.22em] text-taupe">Delivery guide / 01</p>
                    <h2 className="mt-4 max-w-xl font-display text-3xl md:text-5xl">Good things are worth tracking.</h2>
                    <p className="mt-4 max-w-xl leading-7 text-umber">EUROPIUM currently offers delivery in selected areas of Savar. Choose your area at checkout to see the delivery charge before placing your order. Delivery timing can vary, so our team may confirm the details before dispatch.</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/checkout" className="btn-dark">Go to checkout</Link>
                        <Link href="/account" className="border border-sand px-5 py-3 text-sm hover:bg-white">View my orders</Link>
                        <Link href="/contact" className="border border-sand px-5 py-3 text-sm hover:bg-white">Ask a question</Link>
                    </div>
                </section>

                <aside className="border border-sand p-6 md:p-8">
                    <p className="text-xs uppercase tracking-[0.22em] text-taupe">Before checkout</p>
                    <h2 className="mt-3 font-serif text-2xl">A quick checklist</h2>
                    <ul className="mt-6 space-y-4 text-sm leading-6 text-umber">
                        <li className="flex gap-3"><span className="text-taupe">01</span><span>Double-check your phone number and complete delivery address.</span></li>
                        <li className="flex gap-3"><span className="text-taupe">02</span><span>Select the correct delivery area and check its shipping charge.</span></li>
                        <li className="flex gap-3"><span className="text-taupe">03</span><span>Review the payment method and any payment instructions before placing your order.</span></li>
                        <li className="flex gap-3"><span className="text-taupe">04</span><span>Sign in to your account to check order status after ordering.</span></li>
                    </ul>
                    <p className="mt-6 border-t border-sand pt-4 text-xs leading-5 text-taupe">Outside the listed areas? Contact us before ordering so we can check delivery availability.</p>
                </aside>
            </div>

            <section className="mt-14 border border-sand p-6 md:mt-20 md:p-9">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-taupe">Delivery coverage / 02</p>
                        <h2 className="mt-2 font-display text-3xl md:text-4xl">Where we deliver</h2>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-taupe">Choose the closest matching area at checkout. The delivery charge is shown again in your order summary.</p>
                </div>
                <div className="mt-7 grid gap-px border border-sand bg-sand sm:grid-cols-3">
                    {deliveryAreas.map((area, index) => (
                        <article key={area.name} className="bg-warm p-5 md:p-6">
                            <p className="text-xs tracking-[0.18em] text-taupe">AREA / 0{index + 1}</p>
                            <h3 className="mt-4 font-serif text-lg">{area.name}</h3>
                            <div className="mt-6 flex items-baseline justify-between gap-3 border-t border-sand pt-4">
                                <span className="text-sm text-taupe">Delivery charge</span>
                                <strong className="font-display text-2xl">{area.fee}</strong>
                            </div>
                        </article>
                    ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-taupe">These are the currently configured checkout zones and charges. Exact availability may depend on your address; please contact us if you are unsure which area to select.</p>
            </section>

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
