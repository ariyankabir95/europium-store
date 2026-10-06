import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import { getProducts } from "@/lib/catalog";
export const metadata = { title: "Sale", description: "Selected pieces at reduced prices." };
export default async function Sale() { const products = await getProducts(); return <Page title="Sale" intro="Selected pieces at reduced prices while stock lasts."><Catalog products={products.filter((p) => p.salePrice)}/></Page>; }
