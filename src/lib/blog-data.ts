import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  return convexUrl ? new ConvexHttpClient(convexUrl) : null;
}

const fetchPublishedBlogBySlugCached = unstable_cache(
  async (slug: string): Promise<BlogDetail | null> => {
    const client = getConvexClient();
    if (!client) return null;
    return await client.query(api.blogs.getPublishedBySlug, { slug });
  },
  ["public-blog-by-slug"],
  { revalidate: 3600, tags: ["public-data"] },
);

export const getPublishedBlogBySlug = cache(
  async (slug: string): Promise<BlogDetail | null> =>
    await fetchPublishedBlogBySlugCached(slug),
);

const fetchBlogCardsCached = unstable_cache(
  async (category?: string): Promise<BlogCard[]> => {
    const client = getConvexClient();
    if (!client) return [];
    return await client.query(api.blogs.listCards, { category });
  },
  ["public-blog-cards"],
  { revalidate: 3600, tags: ["public-data"] },
);

export const listBlogCards = cache(
  async (category?: string): Promise<BlogCard[]> =>
    await fetchBlogCardsCached(category),
);

export type BlogCardPage = {
  page: BlogCard[];
  continueCursor: string;
  isDone: boolean;
};

const fetchBlogCardsPageCached = unstable_cache(
  async (
    category: string | undefined,
    cursor: string | null,
  ): Promise<BlogCardPage> => {
    const client = getConvexClient();
    if (!client) return { page: [], continueCursor: "", isDone: true };
    return await client.query(api.blogs.listCardsPage, {
      category,
      paginationOpts: { numItems: 12, cursor },
    });
  },
  ["public-blog-cards-page"],
  { revalidate: 3600, tags: ["public-data"] },
);

export async function listBlogCardsPage(
  category: string | undefined,
  cursor: string | null,
): Promise<BlogCardPage> {
  return await fetchBlogCardsPageCached(category, cursor);
}

const fetchBlogCategoriesCached = unstable_cache(
  async (): Promise<string[]> => {
    const client = getConvexClient();
    if (!client) return [];
    const categories = await client.query(api.blogCategories.list);
    return categories.map((category) => category.title);
  },
  ["public-blog-categories"],
  { revalidate: 3600, tags: ["public-data"] },
);

export const listBlogCategories = cache(
  async (): Promise<string[]> => await fetchBlogCategoriesCached(),
);

export type BlogRelatedCard = Pick<
  BlogCard,
  "slug" | "title" | "coverImage" | "category"
>;

const fetchRecentBlogCardsCached = unstable_cache(
  async (limit: number): Promise<BlogRelatedCard[]> => {
    const client = getConvexClient();
    if (!client) return [];
    return await client.query(api.blogs.getRecentCards, { limit });
  },
  ["public-recent-blog-cards"],
  { revalidate: 3600, tags: ["public-data"] },
);

export const getRecentBlogCards = cache(
  async (limit: number): Promise<BlogRelatedCard[]> =>
    await fetchRecentBlogCardsCached(limit),
);
