import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
  title: "Terms and conditions",
  description: "General terms for browsing and ordering from EUROPIUM.",
};

const sections = [
  { title: "Using this website", body: "By using the EUROPIUM website, you agree to use it lawfully and not to interfere with its operation, security or other visitors’ use of the store." },
  { title: "Products and availability", body: "We aim to display product descriptions, images, sizes, colours and prices as accurately as possible. Colours can appear differently across screens. Product availability may change, and an item in a cart is not necessarily reserved until an order is accepted." },
  { title: "Orders and confirmation", body: "Submitting an order is a request to purchase. We may contact you to verify order details, delivery coverage or payment information before confirming or dispatching it. If an item or price is shown incorrectly, we will contact you to resolve the issue before proceeding where appropriate." },
  { title: "Prices, delivery and payment", body: "The price, delivery area, delivery fee and payment options shown at checkout apply to the order unless we confirm a correction with you. For cash on delivery orders, the product amount is payable on delivery; if checkout states that the delivery fee must be paid in advance, dispatch is subject to confirmation of that payment arrangement." },
  { title: "Returns and support", body: "Returns, exchanges and eligible order issues are handled under the information on our Returns page. Please contact us promptly if there is a problem with an order." },
  { title: "Content and intellectual property", body: "Website branding, copy, graphics and other content belong to EUROPIUM or their respective rights holders and may not be copied or reused commercially without permission." },
  { title: "Changes and contact", body: "We may update these terms as the store evolves. The version published on this page is the version visitors should review before ordering. These general terms do not remove any rights that cannot legally be excluded under applicable law." },
];

export default function Terms() {
  return (
    <Page title="Terms and conditions" intro="A clear understanding makes shopping easier. Please review these general terms before placing an order.">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 border-l-2 border-taupe pl-4 text-sm leading-6 text-umber">Last updated: October 2026. This is a general store terms template, not legal advice. Review it for your actual business practices and applicable Bangladesh law before relying on it as a final legal document.</p>
        <div className="divide-y divide-sand border-y border-sand">
          {sections.map((section, index) => (
            <section key={section.title} className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr] sm:gap-6">
              <span className="font-display text-xl text-taupe">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="font-serif text-xl text-charcoal">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-umber">{section.body}</p>
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm leading-6 text-umber">Need help with an order? Visit our <Link href="/contact" className="underline underline-offset-4 hover:text-charcoal">Contact page</Link> or read the <Link href="/returns" className="underline underline-offset-4 hover:text-charcoal">Returns policy</Link>.</p>
      </div>
    </Page>
  );
}
