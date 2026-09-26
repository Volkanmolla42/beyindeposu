import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const STATIC_PATHS = ["/", "/urunler", "/markalar", "/kurumsal", "/iletisim"];
const SITEMAP_URL_LIMIT = 50_000;

type SitemapProductPage = {
  page: { slug: string; lastModified: number }[];
  continueCursor: string;
  isDone: boolean;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
  }));
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) return staticEntries;

  const client = new ConvexHttpClient(convexUrl);
  const productEntries: { slug: string; lastModified: number }[] = [];
  const productLimit = SITEMAP_URL_LIMIT - staticEntries.length;
  let cursor: string | null = null;
  let isDone = false;

  try {
    while (!isDone && productEntries.length < productLimit) {
      const pageSize = Math.min(1_000, productLimit - productEntries.length);
      const result: SitemapProductPage = await client.query(
        api.products.listPublicSitemapEntries,
        { paginationOpts: { numItems: pageSize, cursor } },
      );

      productEntries.push(...result.page);
      cursor = result.continueCursor;
      isDone = result.isDone;
    }
  } catch (error) {
    console.error("Could not load product URLs for the sitemap.", error);
  }

  return [
    ...staticEntries,
    ...productEntries.map((product) => ({
      url: absoluteUrl(`/urunler/${product.slug}`),
      lastModified: new Date(product.lastModified),
    })),
  ];
}
