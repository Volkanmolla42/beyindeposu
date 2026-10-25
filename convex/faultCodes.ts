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

function slugifyCode(text: string): string {
  const trMap: Record<string, string> = {
    ç: "c", Ç: "c",
    ğ: "g", Ğ: "g",
    ı: "i", İ: "i",
    ö: "o", Ö: "o",
    ş: "s", Ş: "s",
    ü: "u", Ü: "u",
  };
  return text
    .split("")
    .map((char) => trMap[char] || char)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const faultCodePublicValidator = v.object({
  code: v.string(),
  slug: v.string(),
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
          slug: slugifyCode(item.code),
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

export const getByCodePublic = query({
  args: { code: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      code: v.string(),
      slug: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      isPopular: v.boolean(),
      image: v.optional(v.string()),
      _creationTime: v.number(),
      relatedCodes: v.array(
        v.object({
          code: v.string(),
          slug: v.string(),
          title: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    let raw = args.code;
    try {
      raw = decodeURIComponent(args.code);
    } catch {
      raw = args.code;
    }
    const normalizedCode = raw.trim().toUpperCase();
    const targetSlug = slugifyCode(raw);
    const targetCompact = targetSlug.replace(/[^a-z0-9]/g, "");

    // 1. Direct match on indexed slug
    let item = await ctx.db
      .query("faultCodes")
      .withIndex("by_slug", (q) => q.eq("slug", targetSlug))
      .first();

    // 2. Direct match on indexed code
    if (!item) {
      item = await ctx.db
        .query("faultCodes")
        .withIndex("by_code", (q) => q.eq("code", normalizedCode))
        .first();
    }

    // 3. Slug / partial / compact match against stored codes
    if (!item) {
      const allCodes = await ctx.db.query("faultCodes").take(200);
      item =
        allCodes.find((c) => {
          const cSlug = c.slug || slugifyCode(c.code);
          if (cSlug === targetSlug) return true;
          // Match primary code prefix e.g. "p0944" from "p0944-f-arizasi-opel-astra-h"
          const primaryCode = cSlug.split("-")[0];
          if (primaryCode === targetSlug) return true;
          // Match compact alphanumeric
          const cCompact = cSlug.replace(/[^a-z0-9]/g, "");
          if (cCompact === targetCompact) return true;
          return false;
        }) ?? null;
    }

    if (!item) return null;

    const currentItem = item;
    const itemSlug = currentItem.slug || slugifyCode(currentItem.code);
    const prefix = currentItem.code.charAt(0).toUpperCase();
    const candidates = await ctx.db.query("faultCodes").take(60);
    const relatedCodes = candidates
      .filter((c) => c._id !== currentItem._id)
      .map((c) => ({
        code: c.code,
        slug: c.slug || slugifyCode(c.code),
        title: c.title,
        samePrefix: c.code.toUpperCase().startsWith(prefix),
      }))
      .sort((a, b) => (b.samePrefix ? 1 : 0) - (a.samePrefix ? 1 : 0))
      .slice(0, 6)
      .map(({ code, slug, title }) => ({ code, slug, title }));

    return {
      code: currentItem.code,
      slug: itemSlug,
      title: currentItem.title,
      description: currentItem.description,
      isPopular: currentItem.isPopular ?? false,
      image: currentItem.imageStorageId
        ? await storageUrl(ctx, currentItem.imageStorageId)
        : undefined,
      _creationTime: currentItem._creationTime,
      relatedCodes,
    };
  },
});

export const listSitemapEntries = query({
  args: {},
  returns: v.array(
    v.object({
      code: v.string(),
      lastModified: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const items = await ctx.db.query("faultCodes").take(1000);
    return items.map((item) => ({
      code: item.slug || slugifyCode(item.code),
      lastModified: item._creationTime,
    }));
  },
});

export const backfillSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("faultCodes").take(500);
    let updated = 0;
    for (const item of items) {
      if (!item.slug) {
        const slug = slugifyCode(item.code);
        await ctx.db.patch(item._id, { slug });
        updated++;
      }
    }
    return { total: items.length, updated };
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    slug: v.optional(v.string()),
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

    const finalSlug = args.slug?.trim() ? slugifyCode(args.slug) : slugifyCode(normalizedCode);
    const existingSlug = await ctx.db
      .query("faultCodes")
      .withIndex("by_slug", (q) => q.eq("slug", finalSlug))
      .first();

    if (existingSlug) {
      throw new Error(`Bu arıza kodu URL bağlantısı (${finalSlug}) zaten kullanımda.`);
    }

    if (args.imageStorageId) {
      await assertValidImageStorage(ctx, args.imageStorageId);
    }

    return await ctx.db.insert("faultCodes", {
      code: normalizedCode,
      slug: finalSlug,
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
    slug: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    isPopular: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, code, slug, title, description, isPopular, imageStorageId } = args;
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

    const finalSlug = slug?.trim() ? slugifyCode(slug) : slugifyCode(normalizedCode);
    const duplicateSlug = await ctx.db
      .query("faultCodes")
      .withIndex("by_slug", (q) => q.eq("slug", finalSlug))
      .first();
    if (duplicateSlug && duplicateSlug._id !== id) {
      throw new Error(`Bu arıza kodu URL bağlantısı (${finalSlug}) zaten kullanımda.`);
    }

    if (imageStorageId) {
      await assertValidImageStorage(ctx, imageStorageId);
    }

    await ctx.db.patch(id, {
      code: normalizedCode,
      slug: finalSlug,
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
