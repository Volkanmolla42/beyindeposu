import "server-only";
import { cache } from "react";
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

export const getServiceBySlug = cache(
  async (slug: string): Promise<ServiceDoc | null> => {
    return await convex().query(api.services.getBySlug, { slug });
  }
);

export async function listPublicServices(): Promise<ServiceDoc[]> {
  return await convex().query(api.services.listPublic, {});
}

export const getSiteContactSettings = cache(async () => {
  return await convex().query(api.settings.getContactSettings, {});
});
