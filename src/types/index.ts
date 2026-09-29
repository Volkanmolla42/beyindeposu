import type { Doc, Id } from "@convex/_generated/dataModel";

type Product = Doc<"products">;

// Product populated with relational category information
export interface ProductWithCategory extends Product {
  categoryName?: string;
  categorySlug?: string;
  category?: {
    _id: Id<"categories">;
    name: string;
    slug: string;
  } | null;
}
