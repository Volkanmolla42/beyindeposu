import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

async function resolveProductWithCategory(ctx: QueryCtx, p: Doc<"products">) {
  const { imageStorageIds: legacyImageStorageIds, ...product } = p;
  void legacyImageStorageIds;
  const cat = p.categoryId
    ? await ctx.db.get(p.categoryId)
    : null;

  return {
    ...product,
    categoryName: cat?.name || "Oto Elektronik",
    categorySlug: cat?.slug || "diger",
    category: cat ? { _id: cat._id, name: cat.name, slug: cat.slug } : null,
  };
}

async function resolvePublicProduct(ctx: QueryCtx, p: Doc<"products">) {
  const resolvedProduct = await resolveProductWithCategory(ctx, p);
  const publicProduct = { ...resolvedProduct };

  // Raf ve taslak durumu admin alanlarıdır.
  delete publicProduct.shelfCode;
  delete publicProduct.isDraft;

  if (publicProduct.tags && p.shelfCode) {
    const shelfToken = p.shelfCode.replace(/[^a-z0-9]/gi, "").toLowerCase();
    publicProduct.tags = publicProduct.tags.filter(
      (tag) => tag.replace(/[^a-z0-9]/gi, "").toLowerCase() !== shelfToken
    );
  }

  return publicProduct;
}

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categorySlug: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    brand: v.optional(v.string()),
    condition: v.optional(v.string()),
    inStockOnly: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let paginated;

    if (args.categoryId) {
      paginated = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (idx) => idx.eq("categoryId", args.categoryId!))
        .filter((q) => q.neq(q.field("isDraft"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (idx) => idx.eq("slug", args.categorySlug!))
        .first();

      if (category) {
        paginated = await ctx.db
          .query("products")
          .withIndex("by_categoryId", (idx) => idx.eq("categoryId", category._id))
          .filter((q) => q.neq(q.field("isDraft"), true))
          .order("desc")
          .paginate(args.paginationOpts);
      } else {
        paginated = await ctx.db
          .query("products")
          .filter((q) => q.neq(q.field("isDraft"), true))
          .order("desc")
          .paginate(args.paginationOpts);
      }
    } else if (args.brand && args.brand !== "Tümü") {
      paginated = await ctx.db
        .query("products")
        .withIndex("by_brand", (idx) => idx.eq("brand", args.brand!))
        .filter((q) => q.neq(q.field("isDraft"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      paginated = await ctx.db
        .query("products")
        .filter((q) => q.neq(q.field("isDraft"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const resolvedPage = await Promise.all(
      paginated.page.map((p) => resolvePublicProduct(ctx, p))
    );

    return {
      ...paginated,
      page: resolvedPage,
    };
  },
});

export const getProductsPage = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    categorySlug: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    brand: v.optional(v.string()),
    condition: v.optional(v.string()),
    inStockOnly: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    draftStatus: v.optional(v.union(v.literal("all"), v.literal("draft"), v.literal("published"))),
  },
  handler: async (ctx, args) => {
    const page = Math.max(1, args.page || 1);
    const pageSize = args.pageSize || 24;

    let items: Doc<"products">[] = [];

    if (args.categoryId) {
      items = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (idx) => idx.eq("categoryId", args.categoryId!))
        .order("desc")
        .collect();
    } else if (args.categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (idx) => idx.eq("slug", args.categorySlug!))
        .first();

      if (category) {
        items = await ctx.db
          .query("products")
          .withIndex("by_categoryId", (idx) => idx.eq("categoryId", category._id))
          .order("desc")
          .collect();
      } else {
        items = [];
      }
    } else if (args.brand && args.brand !== "Tümü") {
      items = await ctx.db
        .query("products")
        .withIndex("by_brand", (idx) => idx.eq("brand", args.brand!))
        .order("desc")
        .collect();
    } else {
      items = await ctx.db
        .query("products")
        .order("desc")
        .collect();
    }

    const draftStatus = args.draftStatus ?? "published";
    if (draftStatus !== "all") {
      items = items.filter((p) => draftStatus === "draft" ? p.isDraft === true : p.isDraft !== true);
    }

    // Filter in memory for condition, inStock, and search term
    let filtered = items;

    if (args.condition && args.condition !== "Tümü") {
      filtered = filtered.filter((p) => p.condition === args.condition);
    }

    if (args.inStockOnly) {
      filtered = filtered.filter((p) => p.inStock);
    }

    if (args.searchTerm && args.searchTerm.trim() !== "") {
      const term = args.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(term);
        const oemMatch = p.oemNumber.toLowerCase().includes(term);
        const shelfMatch = (p.shelfCode || "").toLowerCase().includes(term);
        const tagMatch = (p.tags || []).some((t) => t.toLowerCase().includes(term));
        return titleMatch || oemMatch || shelfMatch || tagMatch;
      });
    }

    // Sorting
    switch (args.sortBy) {
      case "oem-asc":
        filtered.sort((a, b) => (a.oemNumber || "").localeCompare(b.oemNumber || ""));
        break;
      case "title-asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title, "tr"));
        break;
      case "title-desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title, "tr"));
        break;
      case "date-desc":
      default:
        filtered.sort((a, b) => (b.createdAt || b._creationTime || 0) - (a.createdAt || a._creationTime || 0));
        break;
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    const resolvedItems = await Promise.all(
      pageItems.map((p) => resolveProductWithCategory(ctx, p))
    );

    return {
      items: resolvedItems,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize,
    };
  },
});

export const getTotalCount = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products.filter((p) => p.isDraft !== true).length;
  },
});

export const list = query({
  args: {
    categorySlug: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    brand: v.optional(v.string()),
    condition: v.optional(v.string()),
    inStockOnly: v.optional(v.boolean()),
    searchTerm: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items: Doc<"products">[] = [];

    if (args.categoryId) {
      items = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId!))
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(args.limit ?? 200);
    } else if (args.categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .first();

      if (category) {
        items = await ctx.db
          .query("products")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
          .filter((q) => q.neq(q.field("isDraft"), true))
          .take(args.limit ?? 200);
      } else {
        items = [];
      }
    } else if (args.brand) {
      items = await ctx.db
        .query("products")
        .withIndex("by_brand", (q) => q.eq("brand", args.brand!))
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(args.limit ?? 200);
    } else {
      items = await ctx.db
        .query("products")
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(args.limit ?? 300);
    }

    let filtered = items;

    // Prioritize products with images strictly to the top
    filtered.sort((a, b) => {
      const aHasImg = a.images && a.images.length > 0 ? 1 : 0;
      const bHasImg = b.images && b.images.length > 0 ? 1 : 0;
      return bHasImg - aHasImg;
    });

    if (args.condition && args.condition !== "Tümü") {
      filtered = filtered.filter((p) =>
        p.condition.toLowerCase().includes(args.condition!.toLowerCase())
      );
    }

    if (args.inStockOnly) {
      filtered = filtered.filter((p) => p.inStock);
    }

    if (args.searchTerm && args.searchTerm.trim() !== "") {
      const term = args.searchTerm.trim().toLowerCase();
      const cleanTerm = term.replace(/[^a-z0-9]/g, "");

      filtered = filtered.filter((p) => {
        const oemClean = p.oemNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const hasTagMatch = p.tags?.some((t) => t.toLowerCase().includes(term));

        return (
          p.title.toLowerCase().includes(term) ||
          p.oemNumber.toLowerCase().includes(term) ||
          (cleanTerm.length >= 2 && oemClean.includes(cleanTerm)) ||
          p.brand.toLowerCase().includes(term) ||
          (p.model && p.model.toLowerCase().includes(term)) ||
          p.description.toLowerCase().includes(term) ||
          (p.metaKeywords && p.metaKeywords.toLowerCase().includes(term)) ||
          hasTagMatch
        );
      });
    }

    return await Promise.all(filtered.map((p) => resolvePublicProduct(ctx, p)));
  },
});

export const getFeatured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("products")
      .filter((q) => q.neq(q.field("isDraft"), true))
      .take(args.limit ?? 12);

    return await Promise.all(items.map((p) => resolvePublicProduct(ctx, p)));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!product || product.isDraft === true) return null;

    return await resolvePublicProduct(ctx, product);
  },
});

export const getByOem = query({
  args: { oemNumber: v.string() },
  handler: async (ctx, args) => {
    const cleanOem = args.oemNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const all = await ctx.db.query("products").filter((q) => q.neq(q.field("isDraft"), true)).take(200);
    const matched = all.filter((p) => {
      const pOem = p.oemNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
      return pOem.includes(cleanOem) || p.title.toLowerCase().includes(cleanOem);
    });

    return await Promise.all(matched.map((p) => resolvePublicProduct(ctx, p)));
  },
});

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.query.trim().toLowerCase();
    if (!term) return [];
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");

    const all = await ctx.db.query("products").filter((q) => q.neq(q.field("isDraft"), true)).take(200);
    const filtered = all
      .filter((p) => {
        const oemClean = p.oemNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const hasTagMatch = p.tags?.some((t) => t.toLowerCase().includes(term));

        return (
          p.title.toLowerCase().includes(term) ||
          p.oemNumber.toLowerCase().includes(term) ||
          (cleanTerm.length >= 2 && oemClean.includes(cleanTerm)) ||
          p.brand.toLowerCase().includes(term) ||
          (p.model && p.model.toLowerCase().includes(term)) ||
          (p.metaKeywords && p.metaKeywords.toLowerCase().includes(term)) ||
          hasTagMatch
        );
      })
      .slice(0, args.limit ?? 10);

    return await Promise.all(filtered.map((p) => resolvePublicProduct(ctx, p)));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    oemNumber: v.string(),
    shelfCode: v.optional(v.string()),
    categoryId: v.id("categories"),
    brand: v.string(),
    model: v.optional(v.string()),
    condition: v.string(),
    inStock: v.boolean(),
    description: v.string(),
    images: v.array(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("products", {
      ...args,
      isDraft: args.isDraft ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createDraftBatch = mutation({
  args: {
    products: v.array(v.object({
      shelfCode: v.optional(v.string()),
      images: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const [index, product] of args.products.entries()) {
      if (product.images.length === 0) {
        skipped += 1;
        continue;
      }

      const shelfCode = product.shelfCode?.trim() || undefined;
      if (shelfCode) {
        const existing = await ctx.db
          .query("products")
          .withIndex("by_shelfCode", (q) => q.eq("shelfCode", shelfCode))
          .first();
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      const codeSlug = (shelfCode || `urun-${index + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      await ctx.db.insert("products", {
        title: "",
        slug: `taslak-${codeSlug}-${now}-${index}`,
        oemNumber: "",
        shelfCode,
        brand: "",
        condition: "",
        inStock: false,
        description: "",
        images: product.images,
        isDraft: true,
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }

    return { created, skipped };
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    title: v.string(),
    slug: v.string(),
    oemNumber: v.string(),
    shelfCode: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    brand: v.string(),
    model: v.optional(v.string()),
    condition: v.string(),
    inStock: v.boolean(),
    description: v.string(),
    images: v.array(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const toggleStock = mutation({
  args: { id: v.id("products"), inStock: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      inStock: args.inStock,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    // Remove Convex Storage assets left by legacy product records.
    if (product && product.imageStorageIds) {
      for (const storageId of product.imageStorageIds) {
        await ctx.storage.delete(storageId);
      }
    }
    await ctx.db.delete(args.id);
  },
});
