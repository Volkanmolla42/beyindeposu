import "server-only";

import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export const getPublicProductBySlug = cache(async (slug: string) => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;

  const client = new ConvexHttpClient(convexUrl);
  return client.query(api.products.getBySlug, { slug });
});
