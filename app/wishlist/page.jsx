import Page from "@/components/layout/Page";
import WishlistView from "@/components/products/WishlistView";
import { getProducts } from "@/lib/catalog";

export const metadata = { title: "Wishlist" };

export default async function Wishlist() {
  const products = await getProducts();
  return <Page title="Wishlist"><WishlistView products={products} /></Page>;
}
