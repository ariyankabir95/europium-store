import Link from "next/link";
export default function AccountNav() {
    return <nav aria-label="Account" className="mb-10 flex flex-wrap gap-6 border-b border-sand pb-4 text-sm">{[["Orders", "/account"], ["Profile", "/account/profile"], ["Addresses", "/account/addresses"], ["Wishlist", "/wishlist"], ["Support", "/account/support"]].map(([l, h]) => <Link key={h} href={h} className="underline-offset-4 hover:underline">{l}</Link>)}</nav>;
}
