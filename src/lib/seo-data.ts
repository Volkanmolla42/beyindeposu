import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

function getConvexHttpClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  return convexUrl ? new ConvexHttpClient(convexUrl) : null;
}

const fetchProductBySlugCached = unstable_cache(
  async (slug: string) => {
    const client = getConvexHttpClient();
    if (!client) return null;
    return client.query(api.products.getBySlug, { slug });
  },
  ["public-product-by-slug"],
  { revalidate: 3600 },
);

export const getPublicProductBySlug = cache(async (slug: string) => {
  return fetchProductBySlugCached(slug);
});

const fetchCategoryBySlugCached = unstable_cache(
  async (slug: string) => {
    const client = getConvexHttpClient();
    if (!client) return null;
    return client.query(api.categories.getBySlug, { slug });
  },
  ["public-category-by-slug"],
  { revalidate: 3600 },
);

export const getPublicCategoryBySlug = cache(async (slug: string) => {
  return fetchCategoryBySlugCached(slug);
});

const fetchPublicCategoriesCached = unstable_cache(
  async () => {
    const client = getConvexHttpClient();
    if (!client) return [];

    const categories = await client.query(api.categories.list, { onlyActive: true });
    return categories.filter((category) => category.slug.trim().length > 0);
  },
  ["public-categories"],
  { revalidate: 3600 },
);

export const getPublicCategories = cache(async () => {
  return fetchPublicCategoriesCached();
});

const fetchPublicBrandsCached = unstable_cache(
  async () => {
    const client = getConvexHttpClient();
    if (!client) return [];

    const brands = await client.query(api.brands.list, {});
    return brands.filter(
      (brand) => brand.isActive !== false && brand.slug.trim().length > 0,
    );
  },
  ["public-brands"],
  { revalidate: 3600 },
);

export const getPublicBrands = cache(async () => {
  return fetchPublicBrandsCached();
});

export const getPublicBrandBySlug = cache(async (slug: string) => {
  const brands = await getPublicBrands();
  return brands.find((item) => item.slug === slug) ?? null;
});
