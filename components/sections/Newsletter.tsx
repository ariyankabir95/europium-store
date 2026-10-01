import PostForm from "@/components/ui/PostForm";
export default function Newsletter({ title = "Stay in Style", body = "Get updates on new arrivals, collections and private offers." }: { title?: string; body?: string }) {
  return (<section className="bg-cream py-20"><div className="container-site max-w-2xl"><h2 className="font-display text-4xl md:text-5xl">{title}</h2><p className="mb-8 mt-3 text-umber">{body}</p>
    <PostForm inline url="/api/newsletter" fields={[{ name: "email", label: "Email address", type: "email" }]} submit="Subscribe" success="You're subscribed." /></div></section>);
}
