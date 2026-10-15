import Link from "next/link";
import Page from "@/components/layout/Page";

export const metadata = {
  title: "Privacy policy",
  description: "How EUROPIUM handles information when you browse or shop with us.",
};

const sections = [
  { title: "Information you provide", body: "When you place an order or contact us, we may receive details such as your name, contact information, delivery address and order information. Please provide only information needed to complete your request." },
  { title: "How information is used", body: "We use order and contact details to process purchases, arrange delivery, respond to questions, help prevent misuse and maintain our store. We do not use this page to promise practices that have not been verified for every third-party service." },
  { title: "Payments", body: "Payments may be handled through the payment method shown at checkout. Do not send card PINs, passwords or one-time passcodes through messages. For manual payment methods, follow only the instructions confirmed by EUROPIUM." },
  { title: "Cookies and service providers", body: "The website and its service providers may use essential technical storage or similar technologies to support site functionality, security and preferences. Third-party services may process information under their own policies." },
  { title: "Retention and security", body: "We keep information for as long as reasonably needed to manage orders, provide support, meet applicable obligations and resolve disputes. We take reasonable steps to protect information, but no internet transmission or storage system can be guaranteed completely secure." },
  { title: "Your choices and contact", body: "You may contact us to ask about information associated with an order or request a correction where appropriate. Some information may need to be retained for legitimate business or legal reasons." },
];

export default function PrivacyPolicy() {
  return (
    <Page title="Privacy policy" intro="Your information should be treated with care. This page explains the general approach used by EUROPIUM when you browse, contact us or place an order.">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 border-l-2 border-taupe pl-4 text-sm leading-6 text-umber">Last updated: October 2026. This is a general store policy template and should be reviewed against the store’s actual tools, payment providers and applicable local law before being treated as final legal advice.</p>
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
        <p className="mt-8 text-sm leading-6 text-umber">Questions? Visit our <Link href="/contact" className="underline underline-offset-4 hover:text-charcoal">Contact page</Link>.</p>
      </div>
    </Page>
  );
}
