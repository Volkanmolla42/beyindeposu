import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authz";
import schema from "./schema";

export const list = query({
  args: {},
  returns: v.array(schema.doc("blogCategories")),
  handler: async (ctx) => {
    return await ctx.db
      .query("blogCategories")
      .withIndex("by_title")
      .order("asc")
      .take(100);
  },
});

export const listWithCounts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("blogCategories"),
      title: v.string(),
      blogCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const categories = await ctx.db
      .query("blogCategories")
      .withIndex("by_title")
      .order("asc")
      .take(100);
    const blogs = await ctx.db.query("blogs").collect();

    const counts = new Map<string, number>();
    for (const blog of blogs) {
      counts.set(blog.category, (counts.get(blog.category) ?? 0) + 1);
    }

    return categories.map((category) => ({
      _id: category._id,
      title: category.title,
      blogCount: counts.get(category.title) ?? 0,
    }));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const title = args.title.trim();
    if (!title) {
      throw new Error("Kategori başlığı boş olamaz.");
    }

    const existing = await ctx.db
      .query("blogCategories")
      .withIndex("by_title", (q) => q.eq("title", title))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("blogCategories", {
      title,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("blogCategories"),
    title: v.string(),
  },
  returns: v.object({
    affectedSlugs: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const title = args.title.trim();
    if (!title) {
      throw new Error("Kategori başlığı boş olamaz.");
    }

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Kategori bulunamadı.");
    }
    if (category.title === title) {
      return { affectedSlugs: [] as string[] };
    }

    const duplicate = await ctx.db
      .query("blogCategories")
      .withIndex("by_title", (q) => q.eq("title", title))
      .first();
    if (duplicate) {
      throw new Error(`"${title}" adında bir kategori zaten var.`);
    }

    await ctx.db.patch(args.id, { title });

    const affectedBlogs = await ctx.db
      .query("blogs")
      .withIndex("by_category", (q) => q.eq("category", category.title))
      .collect();
    const now = Date.now();
    for (const blog of affectedBlogs) {
      await ctx.db.patch(blog._id, { category: title, updatedAt: now });
    }

    return { affectedSlugs: affectedBlogs.map((blog) => blog.slug) };
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("blogCategories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Kategori bulunamadı.");
    }

    const linkedBlogs = await ctx.db
      .query("blogs")
      .withIndex("by_category", (q) => q.eq("category", category.title))
      .collect();
    if (linkedBlogs.length > 0) {
      throw new Error(
        `"${category.title}" kategorisine bağlı ${linkedBlogs.length} blog yazısı var. Silmek için önce yazıları başka bir kategoriye taşıyın.`,
      );
    }

    await ctx.db.delete(args.id);
  },
});
