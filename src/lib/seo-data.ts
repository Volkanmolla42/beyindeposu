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

export async function getPublicCategoryProductsPage(slug: string) {
  const client = getConvexHttpClient();
  if (!client) return null;

  return client.query(api.products.listPaginated, {
    categorySlug: slug,
    paginationOpts: { numItems: 24, cursor: null },
  });
}

export async function getPublicCategoryPage(slug: string) {
  const category = await getPublicCategoryBySlug(slug);
  if (!category) return null;

  const products = await getPublicCategoryProductsPage(slug);
  if (!products) return null;

  return { category, products };
}

async function listPublicCategories(client: ConvexHttpClient) {
  const categories = await client.query(api.categories.list, { onlyActive: true });
  return categories.filter((category) => category.slug.trim().length > 0);
}

export async function getPublicCategories() {
  const client = getConvexHttpClient();
  if (!client) return [];

  return listPublicCategories(client);
}

export async function listPublicCategoriesWithProducts(client: ConvexHttpClient) {
  const categories = await listPublicCategories(client);
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

export async function getPublicBrandPage(slug: string) {
  const client = getConvexHttpClient();
  if (!client) return null;

  const brands = await client.query(api.brands.list, {});
  const brand = brands.find((item) => item.slug === slug);
  if (!brand) return null;

  const products = await client.query(api.products.listPaginated, {
    brand: brand.name,
    paginationOpts: { numItems: 24, cursor: null },
  });

  return { brand, products };
}

async function listPublicBrands(client: ConvexHttpClient) {
  const brands = await client.query(api.brands.list, {});
  return brands.filter(
    (brand) => brand.isActive !== false && brand.slug.trim().length > 0,
  );
}

export async function getPublicBrands() {
  const client = getConvexHttpClient();
  if (!client) return [];

  return listPublicBrands(client);
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
  const brands = await listPublicBrands(client);
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
