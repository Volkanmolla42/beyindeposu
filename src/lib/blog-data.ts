import "server-only";
import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

export type BlogCard = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  createdAt: number;
  readTime: string;
};

export type BlogDetail = Omit<Doc<"blogs">, "coverImageStorageId"> & {
  coverImage: string;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export const getPublishedBlogBySlug = cache(
  async (slug: string): Promise<BlogDetail | null> =>
    await convex.query(api.blogs.getPublishedBySlug, { slug }),
);

export async function listBlogCards(
  category?: string,
): Promise<BlogCard[]> {
  return await convex.query(api.blogs.listCards, { category });
}

export type BlogCardPage = {
  page: BlogCard[];
  continueCursor: string;
  isDone: boolean;
};

export async function listBlogCardsPage(
  category: string | undefined,
  cursor: string | null,
): Promise<BlogCardPage> {
  return await convex.query(api.blogs.listCardsPage, {
    category,
    paginationOpts: { numItems: 12, cursor },
  });
}

export async function listBlogCategories(): Promise<string[]> {
  const categories = await convex.query(api.blogCategories.list);
  return categories.map((category) => category.title);
}

export type BlogRelatedCard = Pick<
  BlogCard,
  "slug" | "title" | "coverImage" | "category"
>;

export async function getRecentBlogCards(
  limit: number,
): Promise<BlogRelatedCard[]> {
  return await convex.query(api.blogs.getRecentCards, { limit });
}
