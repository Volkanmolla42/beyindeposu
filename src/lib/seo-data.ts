import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

function getConvexHttpClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  return convexUrl ? new ConvexHttpClient(convexUrl) : null;
}

export async function getPublicProductBySlug(slug: string) {
  const client = getConvexHttpClient();
  if (!client) return null;

  return client.query(api.products.getBySlug, { slug });
}

export async function getPublicCategoryBySlug(slug: string) {
  const client = getConvexHttpClient();
  if (!client) return null;

  return client.query(api.categories.getBySlug, { slug });
}

export async function getPublicCategories() {
  const client = getConvexHttpClient();
  if (!client) return [];

  const categories = await client.query(api.categories.list, { onlyActive: true });
  return categories.filter((category) => category.slug.trim().length > 0);
}

export async function listPublicCategoriesWithProducts(client: ConvexHttpClient) {
  const categories = await getPublicCategories();
  const categoriesWithProducts = await Promise.all(
    categories.map(async (category) => {
      const products = await client.query(api.products.listPaginated, {
        categorySlug: category.slug,
        paginationOpts: { numItems: 1, cursor: null },
      });

      return products.page.length > 0 ? category : null;
    }),
  );

  return categoriesWithProducts.filter((category) => category !== null);
}

export async function getPublicBrands() {
  const client = getConvexHttpClient();
  if (!client) return [];

  const brands = await client.query(api.brands.list, {});
  return brands.filter(
    (brand) => brand.isActive !== false && brand.slug.trim().length > 0,
  );
}

export async function getPublicBrandBySlug(slug: string) {
  const brands = await getPublicBrands();
  return brands.find((item) => item.slug === slug) ?? null;
}

export async function getPublicProductSlugs() {
  const client = getConvexHttpClient();
  if (!client) return [];

  const result = await client.query(api.products.listPublicSitemapEntries, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  return result.page
    .map((product) => product.slug.trim())
    .filter((slug) => slug.length > 0);
}

export async function listPublicBrandsWithProducts(client: ConvexHttpClient) {
  const brands = await getPublicBrands();
  const brandsWithProducts = await Promise.all(
    brands.map(async (brand) => {
      const products = await client.query(api.products.list, {
        brand: brand.name,
        limit: 1,
      });

      return products.length > 0 ? brand : null;
    }),
  );

  return brandsWithProducts.filter((brand) => brand !== null);
}
