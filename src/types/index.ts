import { Doc, Id } from "../../convex/_generated/dataModel";
import { SITE_CONTACT } from "@/config/site";

export type Product = Doc<"products">;
export type Category = Doc<"categories">;
export type Brand = Doc<"brands">;
export type SiteSettings = typeof SITE_CONTACT;
export type Conversation = Doc<"conversations">;
export type ChatMessage = Doc<"messages">;

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
