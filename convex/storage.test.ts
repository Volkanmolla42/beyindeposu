/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { email: "admin@example.invalid" }),
  );
  const admin = t.withIdentity({ subject: `${userId}|session` });
  const storeImage = () =>
    t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob(["image"], { type: "image/webp" }),
      );
      // convex-test records only size/sha256; real uploads also store the content type.
      // @ts-expect-error _storage is a system table outside the generated data model.
      await ctx.db.patch(storageId, { contentType: "image/webp" });
      return storageId;
    });
  return { t, admin, storeImage };
}

describe("Convex image storage", () => {
  test("upload URL requires an admin session", async () => {
    const { t, admin } = await fixture();

    await expect(
      t.mutation(api.storage.generateUploadUrl, {}),
    ).rejects.toThrow("Yetkisiz erişim.");
    await expect(
      admin.mutation(api.storage.generateUploadUrl, {}),
    ).resolves.toContain("/api/storage/upload");
  });

  test("blog cover is stored, replaced and deleted with the blog", async () => {
    const { t, admin, storeImage } = await fixture();
    const firstImage = await storeImage();

    const blogId = await admin.mutation(api.blogs.create, {
      title: "Test Yazısı",
      slug: "test-yazisi",
      excerpt: "Özet",
      content: "İçerik",
      coverImageStorageId: firstImage,
      category: "Rehber",
      isPublished: true,
    });

    const published = await t.query(api.blogs.getPublishedBySlug, {
      slug: "test-yazisi",
    });
    expect(published?.coverImage).toContain("/api/storage/");

    const secondImage = await storeImage();
    await admin.mutation(api.blogs.update, {
      id: blogId,
      title: "Test Yazısı",
      slug: "test-yazisi",
      excerpt: "Özet",
      content: "İçerik",
      coverImageStorageId: secondImage,
      category: "Rehber",
      isPublished: true,
    });
    expect(await t.run((ctx) => ctx.storage.getUrl(firstImage))).toBeNull();

    await admin.mutation(api.blogs.deleteBlog, { id: blogId });
    expect(await t.run((ctx) => ctx.storage.getUrl(secondImage))).toBeNull();
  });

  test("service image is stored, replaced and deleted with the service", async () => {
    const { t, admin, storeImage } = await fixture();
    const firstImage = await storeImage();

    const serviceId = await admin.mutation(api.services.create, {
      title: "ABS Tamiri",
      slug: "abs-tamiri",
      shortDesc: "Kısa",
      fullDesc: "Detay",
      imageStorageId: firstImage,
      videoUrl: "/uploads/services/abs.mp4",
      features: [],
      order: 1,
      isActive: true,
    });

    const publicService = await t.query(api.services.getBySlug, {
      slug: "abs-tamiri",
    });
    expect(publicService?.image).toContain("/api/storage/");
    expect(publicService?.videoUrl).toBe("/uploads/services/abs.mp4");

    const secondImage = await storeImage();
    await admin.mutation(api.services.update, {
      id: serviceId,
      title: "ABS Tamiri",
      slug: "abs-tamiri",
      shortDesc: "Kısa",
      fullDesc: "Detay",
      imageStorageId: secondImage,
      videoUrl: "/uploads/services/abs-updated.mp4",
      features: [],
      order: 1,
      isActive: true,
    });
    expect(await t.run((ctx) => ctx.storage.getUrl(firstImage))).toBeNull();

    const updated = await t.query(api.services.getBySlug, { slug: "abs-tamiri" });
    expect(updated?.videoUrl).toBe("/uploads/services/abs-updated.mp4");

    await admin.mutation(api.services.deleteService, { id: serviceId });
    expect(await t.run((ctx) => ctx.storage.getUrl(secondImage))).toBeNull();
  });
});
