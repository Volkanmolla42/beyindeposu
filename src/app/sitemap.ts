import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { absoluteUrl } from "@/lib/seo";
import {
  listPublicBrandsWithProducts,
  listPublicCategoriesWithProducts,
} from "@/lib/seo-data";

export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/parcalar",
  "/tamirveservis",
  "/kategoriler",
  "/markalar",
  "/ariza-kodlari",
  "/blog",
  "/iletisim",
  "/gizlilik",
];
const SITEMAP_URL_LIMIT = 50_000;

type SitemapProductPage = {
  page: { slug: string; lastModified: number }[];
  continueCursor: string;
  isDone: boolean;
};

type SitemapBlogPage = {
  page: { slug: string; lastModified: number }[];
  continueCursor: string;
  isDone: boolean;
};

type SitemapEntry = {
  url: string;
  lastModified?: number;
};

async function getSitemapEntries(): Promise<SitemapEntry[]> {

  const staticEntries: SitemapEntry[] = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
  }));
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) return staticEntries;

  const client = new ConvexHttpClient(convexUrl);
  const categoryEntries: { slug: string; lastModified: number }[] = [];
  const brandEntries: { slug: string }[] = [];
  const productEntries: { slug: string; lastModified: number }[] = [];
  let productLimit = SITEMAP_URL_LIMIT - staticEntries.length;

  try {
    const categories = await listPublicCategoriesWithProducts(client);
    categoryEntries.push(
      ...categories.map((category) => ({
        slug: category.slug,
        lastModified: category.updatedAt ?? category.createdAt ?? category._creationTime,
      })),
    );
    productLimit -= categoryEntries.length;
  } catch (error) {
    console.error("Could not load category URLs for the sitemap.", error);
  }

  try {
    const brands = await listPublicBrandsWithProducts(client);
    brandEntries.push(...brands.map((brand) => ({ slug: brand.slug })));
    productLimit -= brandEntries.length;
  } catch (error) {
    console.error("Could not load brand URLs for the sitemap.", error);
  }

  const blogEntries: { slug: string; lastModified: number }[] = [];
  let blogCursor: string | null = null;
  let blogDone = false;

  try {
    while (!blogDone && blogEntries.length < SITEMAP_URL_LIMIT) {
      const result: SitemapBlogPage = await client.query(
        api.blogs.listSitemapEntries,
        {
          paginationOpts: {
            numItems: Math.min(1_000, SITEMAP_URL_LIMIT - blogEntries.length),
            cursor: blogCursor,
          },
        },
      );

      blogEntries.push(
        ...result.page.filter((blog) => blog.slug.trim().length > 0),
      );
      blogCursor = result.continueCursor;
      blogDone = result.isDone;
    }
    productLimit -= blogEntries.length;
  } catch (error) {
    console.error("Could not load blog URLs for the sitemap.", error);
  }

  const serviceEntries: { slug: string; lastModified: number }[] = [];
  try {
    const services = await client.query(api.services.listSitemapEntries, {});
    serviceEntries.push(...services.filter((s) => s.slug.trim().length > 0));
    productLimit -= serviceEntries.length;
  } catch (error) {
    console.error("Could not load service URLs for the sitemap.", error);
  }

  let cursor: string | null = null;
  let isDone = false;

  try {
    while (!isDone && productEntries.length < productLimit) {
      const pageSize = Math.min(1_000, productLimit - productEntries.length);
      const result: SitemapProductPage = await client.query(
        api.products.listPublicSitemapEntries,
        { paginationOpts: { numItems: pageSize, cursor } },
      );

      productEntries.push(...result.page.filter((product) => product.slug.trim().length > 0));
      cursor = result.continueCursor;
      isDone = result.isDone;
    }
  } catch (error) {
    console.error("Could not load product URLs for the sitemap.", error);
  }

  return [
    ...staticEntries,
    ...categoryEntries.map((category) => ({
      url: absoluteUrl(`/kategoriler/${category.slug}`),
      lastModified: category.lastModified,
    })),
    ...brandEntries.map((brand) => ({
      url: absoluteUrl(`/markalar/${brand.slug}`),
    })),
    ...serviceEntries.map((service) => ({
      url: absoluteUrl(`/tamirveservis/${service.slug}`),
      lastModified: service.lastModified,
    })),
    ...blogEntries.map((blog) => ({
      url: absoluteUrl(`/blog/${blog.slug}`),
      lastModified: blog.lastModified,
    })),
    ...productEntries.map((product) => ({
      url: absoluteUrl(`/parcalar/${product.slug}`),
      lastModified: product.lastModified,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();

  return entries.map(({ url, lastModified }) =>
    lastModified === undefined ? { url } : { url, lastModified: new Date(lastModified) },
  );
}
