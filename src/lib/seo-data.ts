import "server-only";

import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

function getConvexHttpClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  return convexUrl ? new ConvexHttpClient(convexUrl) : null;
}

export const getPublicProductBySlug = cache(async (slug: string) => {
  const client = getConvexHttpClient();
  if (!client) return null;

  return client.query(api.products.getBySlug, { slug });
});

export const getPublicCategoryBySlug = cache(async (slug: string) => {
  const client = getConvexHttpClient();
  if (!client) return null;

  return client.query(api.categories.getBySlug, { slug });
});

export const getPublicCategoryProductsPage = cache(async (slug: string) => {
  const client = getConvexHttpClient();
  if (!client) return null;

  return client.query(api.products.listPaginated, {
    categorySlug: slug,
    paginationOpts: { numItems: 24, cursor: null },
  });
});

export const getPublicCategoryPage = cache(async (slug: string) => {
  const category = await getPublicCategoryBySlug(slug);
  if (!category) return null;

  const products = await getPublicCategoryProductsPage(slug);
  if (!products) return null;

  return { category, products };
});

export async function listPublicCategories(client: ConvexHttpClient) {
  const categories = await client.query(api.categories.list, { onlyActive: true });
  return categories.filter((category) => category.slug.trim().length > 0);
}

export const getPublicCategories = cache(async () => {
  const client = getConvexHttpClient();
  if (!client) return [];

  return listPublicCategories(client);
});

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

export const getPublicCategoriesWithProducts = cache(async () => {
  const client = getConvexHttpClient();
  if (!client) return [];

  return listPublicCategoriesWithProducts(client);
});

export const getPublicBrandPage = cache(async (slug: string) => {
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
});

export async function listPublicBrands(client: ConvexHttpClient) {
  const brands = await client.query(api.brands.list, {});
  return brands.filter(
    (brand) => brand.isActive !== false && brand.slug.trim().length > 0,
  );
}

export const getPublicBrands = cache(async () => {
  const client = getConvexHttpClient();
  if (!client) return [];

  return listPublicBrands(client);
});

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

export const getPublicBrandsWithProducts = cache(async () => {
  const client = getConvexHttpClient();
  if (!client) return [];

  return listPublicBrandsWithProducts(client);
});
