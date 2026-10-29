import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";

export type ServiceDoc = Omit<Doc<"services">, "imageStorageId"> & {
  image: string;
};

function convex(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  return new ConvexHttpClient(url);
}

const fetchServiceBySlugCached = unstable_cache(
  async (slug: string): Promise<ServiceDoc | null> => {
    return await convex().query(api.services.getBySlug, { slug });
  },
  ["service-by-slug"],
  { revalidate: 3600 },
);

export const getServiceBySlug = cache(
  async (slug: string): Promise<ServiceDoc | null> => {
    return await fetchServiceBySlugCached(slug);
  }
);

const fetchPublicServicesCached = unstable_cache(
  async (): Promise<ServiceDoc[]> => {
    return await convex().query(api.services.listPublic, {});
  },
  ["public-services"],
  { revalidate: 3600 },
);

export const listPublicServices = cache(async (): Promise<ServiceDoc[]> => {
  return await fetchPublicServicesCached();
});

const fetchSiteContactSettingsCached = unstable_cache(
  async () => {
    return await convex().query(api.settings.getContactSettings, {});
  },
  ["site-contact-settings"],
  { revalidate: 3600 },
);

export const getSiteContactSettings = cache(async () => {
  return await fetchSiteContactSettingsCached();
});
