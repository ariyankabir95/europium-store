import Page from "@/components/layout/Page";
import { getSettings } from "@/lib/cms";
import PostForm from "@/components/ui/PostForm";
export const metadata = { title: "Contact", description: "Get in touch with EUROPIUM." };
export default async function Contact() {
  const s = await getSettings();
  return (<Page title="Contact" intro="Questions about an order, fit or fabric? Write to us and we'll reply within two working days."><PostForm url="/api/contact" submit="Send message" success="Message sent. We'll be in touch soon." fields={[{ name: "name", label: "Name" }, { name: "email", label: "Email", type: "email" }, { name: "subject", label: "Subject" }, { name: "message", label: "Message", area: true }]} />{(s.contact_email || s.phone) && <p className="mt-10 text-sm text-umber">Or reach us directly: {s.contact_email}{s.contact_email && s.phone && " · "}{s.phone}</p>}</Page>);
}
