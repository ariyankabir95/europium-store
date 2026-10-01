import Header from "@/components/layout/Header";
export default function Page({ title, intro, children }: { title?: string; intro?: string; children: React.ReactNode }) {
  return (<><Header /><main id="main" className="container-site pt-28 pb-20 md:pt-36">{title && <header className="mb-10 max-w-2xl"><h1 className="font-display text-4xl md:text-6xl">{title}</h1>{intro && <p className="mt-4 text-umber">{intro}</p>}</header>}{children}</main></>);
}
