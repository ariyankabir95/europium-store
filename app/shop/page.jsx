import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import { getProducts } from "@/lib/catalog";
export const metadata = { title: "Shop", description: "Shop tailoring, knitwear, outerwear and accessories." };
export default async function Shop() { const products = await getProducts(); return <Page title="Shop" intro="Everything in the current collection."><Catalog products={products}/></Page>; }
