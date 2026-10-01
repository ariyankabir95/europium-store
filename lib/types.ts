export type Badge = "NEW" | "SALE" | "BESTSELLER";
export interface Category { slug: string; name: string; description: string; parent?: string }
export interface Color { name: string; hex: string }
export interface Product {
  id: string; slug: string; name: string; description: string;
  price: number; salePrice?: number; currency: "USD";
  category: string; tags: string[]; badge?: Badge;
  images: string[]; sizes: string[]; colors: Color[];
  /** Every active size+color combination that actually exists, with its own stock availability. A size/color pair absent here is not a real variant, not just out of stock. */
  variants: { size: string; color: string; available: boolean }[];
  rating: number; reviewCount: number; sold: number; inStock?: boolean; createdAt: string;
  materials: string; care: string;
}
export interface Collection { slug: string; title: string; description: string; image: string }
