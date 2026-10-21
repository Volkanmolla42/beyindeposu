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
