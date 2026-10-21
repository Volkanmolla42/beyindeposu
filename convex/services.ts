import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authz";
import { assertValidImageStorage } from "./imageStorage";
import schema from "./schema";
import { assertValidSlug } from "./slug";
import { storageUrl } from "./storage";

const servicePublicValidator = schema
  .doc("services")
  .omit("imageStorageId")
  .extend({ image: v.string() });

const serviceAdminValidator = schema.doc("services").extend({
  image: v.string(),
});

export const listPublic = query({
  args: {},
  returns: v.array(servicePublicValidator),
  handler: async (ctx) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_isActive_and_order", (q) => q.eq("isActive", true))
      .take(100);

    return await Promise.all(
      services.map(async (service) => {
        const { imageStorageId, ...rest } = service;
        return {
          ...rest,
          image: await storageUrl(ctx, imageStorageId),
        };
      }),
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(servicePublicValidator, v.null()),
  handler: async (ctx, args) => {
    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!service || !service.isActive) return null;

    const { imageStorageId, ...rest } = service;
    return {
      ...rest,
      image: await storageUrl(ctx, imageStorageId),
    };
  },
});

export const listSitemapEntries = query({
  args: {},
  returns: v.array(
    v.object({
      slug: v.string(),
      lastModified: v.number(),
    })
  ),
  handler: async (ctx) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_isActive_and_order", (q) => q.eq("isActive", true))
      .take(100);
    return services.map((s) => ({
      slug: s.slug,
      lastModified: s.updatedAt || s._creationTime,
    }));
  },
});

export const listAdmin = query({
  args: {},
  returns: v.array(serviceAdminValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const services = await ctx.db.query("services").take(100);
    return await Promise.all(
      services
        .sort((a, b) => a.order - b.order)
        .map(async (service) => ({
          ...service,
          image: await storageUrl(ctx, service.imageStorageId),
        })),
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    shortDesc: v.string(),
    fullDesc: v.string(),
    imageStorageId: v.id("_storage"),
    videoUrl: v.optional(v.string()),
    features: v.array(v.string()),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertValidImageStorage(ctx, args.imageStorageId);
    const slug = args.slug.trim().toLowerCase();
    assertValidSlug(slug);
    const existing = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) {
      throw new Error(`Bu bağlantı adresi (${slug}) zaten kayıtlı.`);
    }

    return await ctx.db.insert("services", {
      title: args.title.trim(),
      slug,
      shortDesc: args.shortDesc.trim(),
      fullDesc: args.fullDesc.trim(),
      imageStorageId: args.imageStorageId,
      videoUrl: args.videoUrl?.trim() || undefined,
      features: args.features.map((f) => f.trim()).filter(Boolean),
      order: args.order,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("services"),
    title: v.string(),
    slug: v.string(),
    shortDesc: v.string(),
    fullDesc: v.string(),
    imageStorageId: v.id("_storage"),
    videoUrl: v.optional(v.string()),
    features: v.array(v.string()),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertValidImageStorage(ctx, args.imageStorageId);
    const service = await ctx.db.get(args.id);
    if (!service) throw new Error("Servis bulunamadı.");

    const slug = args.slug.trim().toLowerCase();
    assertValidSlug(slug);
    if (slug !== service.slug) {
      const existing = await ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (existing && existing._id !== args.id) {
        throw new Error(`Bu bağlantı adresi (${slug}) zaten kayıtlı.`);
      }
    }

    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      slug,
      shortDesc: args.shortDesc.trim(),
      fullDesc: args.fullDesc.trim(),
      imageStorageId: args.imageStorageId,
      videoUrl: args.videoUrl?.trim() || undefined,
      features: args.features.map((f) => f.trim()).filter(Boolean),
      order: args.order,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    if (service.imageStorageId !== args.imageStorageId) {
      await ctx.storage.delete(service.imageStorageId);
    }
  },
});

export const toggleActive = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const service = await ctx.db.get(args.id);
    if (!service) throw new Error("Servis bulunamadı.");
    await ctx.db.patch(args.id, {
      isActive: !service.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const deleteService = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const service = await ctx.db.get(args.id);
    if (!service) throw new Error("Servis bulunamadı.");

    await ctx.storage.delete(service.imageStorageId);
    await ctx.db.delete(args.id);
  },
});
