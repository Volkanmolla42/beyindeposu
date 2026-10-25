import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authz";
import { assertValidImageStorage } from "./imageStorage";
import { storageUrl } from "./storage";
import schema from "./schema";

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  returns: v.array(schema.doc("faultCodes")),
  handler: async (ctx, args) => {
    const search = args.search?.trim();
    if (!search) {
      const items = await ctx.db.query("faultCodes").take(100);
      return items.sort((a, b) => a.code.localeCompare(b.code));
    }

    const [byCode, byTitle] = await Promise.all([
      ctx.db
        .query("faultCodes")
        .withSearchIndex("search_code", (q) => q.search("code", search))
        .take(50),
      ctx.db
        .query("faultCodes")
        .withSearchIndex("search_title", (q) => q.search("title", search))
        .take(50),
    ]);
    const merged = new Map(
      [...byCode, ...byTitle].map((item) => [item._id, item] as const),
    );

    return [...merged.values()].sort((a, b) => a.code.localeCompare(b.code));
  },
});

const faultCodePublicValidator = v.object({
  code: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  isPopular: v.boolean(),
  image: v.optional(v.string()),
});

export const listPublic = query({
  args: {},
  returns: v.array(faultCodePublicValidator),
  handler: async (ctx) => {
    const items = await ctx.db.query("faultCodes").take(100);
    return await Promise.all(
      items
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(async (item) => ({
          code: item.code,
          title: item.title,
          description: item.description,
          isPopular: item.isPopular ?? false,
          image: item.imageStorageId
            ? await storageUrl(ctx, item.imageStorageId)
            : undefined,
        })),
    );
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    isPopular: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const normalizedCode = args.code.trim().toUpperCase();
    const existing = await ctx.db
      .query("faultCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing) {
      throw new Error(`Bu arıza kodu (${normalizedCode}) zaten kayıtlı.`);
    }

    if (args.imageStorageId) {
      await assertValidImageStorage(ctx, args.imageStorageId);
    }

    return await ctx.db.insert("faultCodes", {
      code: normalizedCode,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      isPopular: args.isPopular ?? false,
      imageStorageId: args.imageStorageId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("faultCodes"),
    code: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    isPopular: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, code, title, description, isPopular, imageStorageId } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Arıza kodu bulunamadı");

    const normalizedCode = code.trim().toUpperCase();
    const duplicate = await ctx.db
      .query("faultCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();
    if (duplicate && duplicate._id !== id) {
      throw new Error(`Bu arıza kodu (${normalizedCode}) zaten kayıtlı.`);
    }

    if (imageStorageId) {
      await assertValidImageStorage(ctx, imageStorageId);
    }

    await ctx.db.patch(id, {
      code: normalizedCode,
      title: title.trim(),
      description: description?.trim() || undefined,
      isPopular: isPopular ?? false,
      imageStorageId,
    });

    if (existing.imageStorageId && existing.imageStorageId !== imageStorageId) {
      await ctx.storage.delete(existing.imageStorageId);
    }
  },
});

export const togglePopular = mutation({
  args: { id: v.id("faultCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Arıza kodu bulunamadı");
    await ctx.db.patch(args.id, {
      isPopular: !item.isPopular,
    });
  },
});

export const deleteFaultCode = mutation({
  args: { id: v.id("faultCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Arıza kodu bulunamadı");
    if (item.imageStorageId) {
      await ctx.storage.delete(item.imageStorageId);
    }
    await ctx.db.delete(args.id);
  },
});
