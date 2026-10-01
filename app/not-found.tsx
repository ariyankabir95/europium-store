import Link from "next/link";
import Page from "@/components/layout/Page";
export default function NotFound() { return <Page title="Page not found" intro="That page doesn't exist or has moved."><Link href="/shop" className="btn-dark">Go to the shop</Link></Page>; }
