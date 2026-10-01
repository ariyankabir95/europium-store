import type { Metadata } from "next";
import Page from "@/components/layout/Page";
import Catalog from "@/components/products/Catalog";
import { getProducts } from "@/lib/catalog";
export const metadata: Metadata = { title: "Search" };
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = await getProducts();
  return <Page title="Search"><Catalog products={products} initialQuery={q} /></Page>;
}
