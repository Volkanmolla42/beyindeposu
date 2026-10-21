import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./authz";
import { assertValidImageStorage } from "./imageStorage";
import schema from "./schema";
import { assertValidSlug } from "./slug";
import { storageUrl } from "./storage";

const BLOG_CARD_LIMIT = 50;

const blogCardValidator = v.object({
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  coverImage: v.string(),
  category: v.string(),
  createdAt: v.number(),
  readTime: v.string(),
});

const blogPublicValidator = schema
  .doc("blogs")
  .omit("coverImageStorageId")
  .extend({ coverImage: v.string() });

const blogAdminValidator = schema.doc("blogs").extend({
  coverImage: v.string(),
});

function calculateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} dk`;
}

async function findPublishedBySlug(ctx: QueryCtx, slug: string) {
  const normalized = slug.trim().toLowerCase();
  const blog = await ctx.db
    .query("blogs")
    .withIndex("by_slug", (q) => q.eq("slug", normalized))
    .first();

  return blog?.isPublished ? blog : null;
}

async function toBlogCard(ctx: QueryCtx, blog: Doc<"blogs">) {
  return {
    slug: blog.slug,
    title: blog.title,
    excerpt: blog.excerpt,
    coverImage: await storageUrl(ctx, blog.coverImageStorageId),
    category: blog.category,
    createdAt: blog.createdAt,
    readTime: calculateReadTime(blog.content),
  };
}

export const listCards = query({
  args: { category: v.optional(v.string()) },
  returns: v.array(blogCardValidator),
  handler: async (ctx, args) => {
    const category = args.category?.trim();
    const blogs = category
      ? await ctx.db
          .query("blogs")
          .withIndex("by_published_category", (q) =>
            q.eq("isPublished", true).eq("category", category),
          )
          .order("desc")
          .take(BLOG_CARD_LIMIT)
      : await ctx.db
          .query("blogs")
          .withIndex("by_isPublished", (q) => q.eq("isPublished", true))
          .order("desc")
          .take(BLOG_CARD_LIMIT);

    return await Promise.all(blogs.map((blog) => toBlogCard(ctx, blog)));
  },
});

export const listCardsPage = query({
  args: {
    category: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(blogCardValidator),
  handler: async (ctx, args) => {
    const category = args.category?.trim();
    const result = category
      ? await ctx.db
          .query("blogs")
          .withIndex("by_published_category", (q) =>
            q.eq("isPublished", true).eq("category", category),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("blogs")
          .withIndex("by_isPublished", (q) => q.eq("isPublished", true))
          .order("desc")
          .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(result.page.map((blog) => toBlogCard(ctx, blog))),
    };
  },
});

export const listAdmin = query({
  args: {
    search: v.optional(v.string()),
  },
  returns: v.array(blogAdminValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let items = await ctx.db.query("blogs").order("desc").take(100);

    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.excerpt.toLowerCase().includes(q)
      );
    }

    return await Promise.all(
      items.map(async (blog) => ({
        ...blog,
        coverImage: await storageUrl(ctx, blog.coverImageStorageId),
      })),
    );
  },
});

export const getPublishedBySlug = query({
  args: { slug: v.string() },
  returns: v.union(blogPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const blog = await findPublishedBySlug(ctx, args.slug);
    if (!blog) return null;

    const { coverImageStorageId, ...rest } = blog;
    return {
      ...rest,
      coverImage: await storageUrl(ctx, coverImageStorageId),
    };
  },
});

export const publishedSlugExists = query({
  args: { slug: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    Boolean(await findPublishedBySlug(ctx, args.slug)),
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(blogAdminValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const slug = args.slug.trim().toLowerCase();
    const blog = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!blog) return null;
    return {
      ...blog,
      coverImage: await storageUrl(ctx, blog.coverImageStorageId),
    };
  },
});

export const getRecentCards = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      slug: v.string(),
      title: v.string(),
      coverImage: v.string(),
      category: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 3, 1), 12);
    const blogs = await ctx.db
      .query("blogs")
      .withIndex("by_isPublished", (q) => q.eq("isPublished", true))
      .order("desc")
      .take(limit);

    return await Promise.all(
      blogs.map(async (blog) => ({
        slug: blog.slug,
        title: blog.title,
        coverImage: await storageUrl(ctx, blog.coverImageStorageId),
        category: blog.category,
      })),
    );
  },
});

export const listSitemapEntries = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({ slug: v.string(), lastModified: v.number() }),
  ),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("blogs")
      .withIndex("by_isPublished", (q) => q.eq("isPublished", true))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((blog) => ({
        slug: blog.slug,
        lastModified: blog.updatedAt,
      })),
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageStorageId: v.id("_storage"),
    category: v.string(),
    isPublished: v.boolean(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await assertValidImageStorage(ctx, args.coverImageStorageId);

    let slug = args.slug.trim().toLowerCase();
    assertValidSlug(slug);

    const existing = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const now = Date.now();
    return await ctx.db.insert("blogs", {
      title: args.title.trim(),
      slug,
      excerpt: args.excerpt.trim(),
      content: args.content.trim(),
      coverImageStorageId: args.coverImageStorageId,
      category: args.category.trim(),
      isPublished: args.isPublished,
      tags: args.tags ?? [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("blogs"),
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageStorageId: v.id("_storage"),
    category: v.string(),
    isPublished: v.boolean(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...data } = args;
    await assertValidImageStorage(ctx, data.coverImageStorageId);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Blog yazısı bulunamadı.");

    const slug = data.slug.trim().toLowerCase();
    assertValidSlug(slug);

    const sameSlug = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (sameSlug && sameSlug._id !== id) {
      throw new Error(`Bu URL bağlantısı (${slug}) başka bir yazıda kullanılıyor.`);
    }

    const now = Date.now();
    await ctx.db.patch(id, {
      title: data.title.trim(),
      slug,
      excerpt: data.excerpt.trim(),
      content: data.content.trim(),
      coverImageStorageId: data.coverImageStorageId,
      category: data.category.trim(),
      isPublished: data.isPublished,
      tags: data.tags ?? [],
      updatedAt: now,
    });

    if (existing.coverImageStorageId !== data.coverImageStorageId) {
      await ctx.storage.delete(existing.coverImageStorageId);
    }
  },
});

export const togglePublish = mutation({
  args: { id: v.id("blogs") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Blog yazısı bulunamadı.");

    await ctx.db.patch(args.id, {
      isPublished: !item.isPublished,
      updatedAt: Date.now(),
    });
  },
});

export const deleteBlog = mutation({
  args: { id: v.id("blogs") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Blog yazısı bulunamadı.");

    await ctx.storage.delete(item.coverImageStorageId);
    await ctx.db.delete(args.id);
  },
});
