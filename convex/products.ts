import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { OrderedQuery, PaginationOptions } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAdmin } from "./authz";

async function resolveProductWithCategory(ctx: QueryCtx, p: Doc<"products">) {
  const product = {
    _id: p._id,
    _creationTime: p._creationTime,
    title: p.title,
    slug: p.slug,
    oemNumber: p.oemNumber,
    shelfCode: p.shelfCode,
    categoryId: p.categoryId,
    brand: p.brand,
    model: p.model,
    condition: p.condition,
    inStock: p.inStock,
    description: p.description,
    images: p.images,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    metaKeywords: p.metaKeywords,
    tags: p.tags,
    isDraft: p.isDraft,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
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
  // Raf ve taslak durumu admin alanlarıdır.
  const { shelfCode: _shelfCode, isDraft: _isDraft, ...publicFields } = resolvedProduct;

  let tags = publicFields.tags;
  if (tags && p.shelfCode) {
    const shelfToken = p.shelfCode.replace(/[^a-z0-9]/gi, "").toLowerCase();
    tags = tags.filter(
      (tag) => tag.replace(/[^a-z0-9]/gi, "").toLowerCase() !== shelfToken
    );
  }

  return {
    ...publicFields,
    tags,
  };
}

type ProductFilterArgs = {
  categorySlug?: string;
  categoryId?: Id<"categories">;
  brand?: string;
  condition?: string;
  inStockOnly?: boolean;
  stockStatus?: "all" | "in_stock" | "out_of_stock";
  searchTerm?: string;
  sortBy?: string;
};

const productFilterArgs = {
  categorySlug: v.optional(v.string()),
  categoryId: v.optional(v.id("categories")),
  brand: v.optional(v.string()),
  condition: v.optional(v.string()),
  inStockOnly: v.optional(v.boolean()),
  stockStatus: v.optional(v.union(v.literal("all"), v.literal("in_stock"), v.literal("out_of_stock"))),
  searchTerm: v.optional(v.string()),
  sortBy: v.optional(v.string()),
};

function productQuery(
  ctx: QueryCtx,
  args: ProductFilterArgs,
  categoryId: Id<"categories"> | undefined,
): OrderedQuery<DataModel["products"]> {
  const sortBy = args.sortBy ?? "date-desc";
  const direction = sortBy === "title-desc" ? "desc" : "asc";

  if (categoryId) {
    if (sortBy === "title-asc" || sortBy === "title-desc") {
      return ctx.db.query("products")
        .withIndex("by_categoryId_and_title", (q) => q.eq("categoryId", categoryId))
        .order(direction);
    }
    if (sortBy === "oem-asc") {
      return ctx.db.query("products")
        .withIndex("by_categoryId_and_oemNumber", (q) => q.eq("categoryId", categoryId))
        .order("asc");
    }
    return ctx.db.query("products")
      .withIndex("by_categoryId_and_createdAt", (q) => q.eq("categoryId", categoryId))
      .order("desc");
  }

  if (args.brand && args.brand !== "Tümü") {
    if (sortBy === "title-asc" || sortBy === "title-desc") {
      return ctx.db.query("products")
        .withIndex("by_brand_and_title", (q) => q.eq("brand", args.brand!))
        .order(direction);
    }
    if (sortBy === "oem-asc") {
      return ctx.db.query("products")
        .withIndex("by_brand_and_oemNumber", (q) => q.eq("brand", args.brand!))
        .order("asc");
    }
    return ctx.db.query("products")
      .withIndex("by_brand_and_createdAt", (q) => q.eq("brand", args.brand!))
      .order("desc");
  }

  if (sortBy === "title-asc" || sortBy === "title-desc") {
    return ctx.db.query("products").withIndex("by_title").order(direction);
  }
  if (sortBy === "oem-asc") {
    return ctx.db.query("products").withIndex("by_oemNumber").order("asc");
  }
  return ctx.db.query("products").withIndex("by_createdAt").order("desc");
}

function applyProductFilters(
  query: OrderedQuery<DataModel["products"]>,
  args: ProductFilterArgs,
  draftStatus: "all" | "draft" | "published",
) {
  let filtered = query;

  if (draftStatus === "draft") {
    filtered = filtered.filter((q) => q.eq(q.field("isDraft"), true));
  } else if (draftStatus === "published") {
    filtered = filtered.filter((q) => q.neq(q.field("isDraft"), true));
  }

  if (args.condition && args.condition !== "Tümü") {
    filtered = filtered.filter((q) => q.eq(q.field("condition"), args.condition!));
  }
  if (args.stockStatus === "in_stock" || args.inStockOnly) {
    filtered = filtered.filter((q) => q.eq(q.field("inStock"), true));
  } else if (args.stockStatus === "out_of_stock") {
    filtered = filtered.filter((q) => q.eq(q.field("inStock"), false));
  }

  return filtered;
}

async function resolveCategoryId(ctx: QueryCtx, args: ProductFilterArgs) {
  if (args.categoryId) return args.categoryId;
  if (!args.categorySlug) return undefined;

  const category = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
    .first();
  return category?._id;
}

function emptyPaginationResult(paginationOpts: PaginationOptions) {
  return {
    page: [],
    isDone: true,
    continueCursor: paginationOpts.cursor ?? "",
  };
}

async function paginateProducts(
  ctx: QueryCtx,
  args: ProductFilterArgs & { paginationOpts: PaginationOptions },
  draftStatus: "all" | "draft" | "published",
) {
  const categoryId = await resolveCategoryId(ctx, args);
  if ((args.categoryId || args.categorySlug) && !categoryId) {
    return emptyPaginationResult(args.paginationOpts);
  }

  const searchTerm = args.searchTerm?.trim();
  let query: OrderedQuery<DataModel["products"]>;

  if (searchTerm) {
    const isOemSearch = searchTerm.length >= 4 && /\d/.test(searchTerm) && !/\s/.test(searchTerm);
    const isShelfSearch = /^raf(?:$|[-_\s]|\d)/i.test(searchTerm);
    const brand = args.brand && args.brand !== "Tümü" ? args.brand : undefined;
    const condition = args.condition && args.condition !== "Tümü" ? args.condition : undefined;
    const inStockFilter =
      args.stockStatus === "in_stock" || args.inStockOnly
        ? true
        : args.stockStatus === "out_of_stock"
        ? false
        : undefined;

    if (isShelfSearch) {
      query = ctx.db.query("products").withSearchIndex("search_shelfCode", (q) => {
        let search = q.search("shelfCode", searchTerm);
        if (brand) search = search.eq("brand", brand);
        if (categoryId) search = search.eq("categoryId", categoryId);
        if (condition) search = search.eq("condition", condition);
        if (inStockFilter !== undefined) search = search.eq("inStock", inStockFilter);
        return search;
      });
    } else if (isOemSearch) {
      query = ctx.db.query("products").withSearchIndex("search_oemNumber", (q) => {
        let search = q.search("oemNumber", searchTerm);
        if (brand) search = search.eq("brand", brand);
        if (categoryId) search = search.eq("categoryId", categoryId);
        if (condition) search = search.eq("condition", condition);
        if (inStockFilter !== undefined) search = search.eq("inStock", inStockFilter);
        return search;
      });
    } else {
      query = ctx.db.query("products").withSearchIndex("search_title", (q) => {
        let search = q.search("title", searchTerm);
        if (brand) search = search.eq("brand", brand);
        if (categoryId) search = search.eq("categoryId", categoryId);
        if (condition) search = search.eq("condition", condition);
        if (inStockFilter !== undefined) search = search.eq("inStock", inStockFilter);
        return search;
      });
    }
  } else {
    query = productQuery(ctx, args, categoryId);
  }

  const filtered = applyProductFilters(query, args, draftStatus);
  return await filtered.paginate(args.paginationOpts);
}

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    ...productFilterArgs,
  },
  handler: async (ctx, args) => {
    const result = await paginateProducts(ctx, args, "published");
    return {
      ...result,
      page: await Promise.all(result.page.map((product) => resolvePublicProduct(ctx, product))),
    };
  },
});

export const listPaginatedAdmin = query({
  args: {
    paginationOpts: paginationOptsValidator,
    ...productFilterArgs,
    draftStatus: v.optional(v.union(v.literal("all"), v.literal("draft"), v.literal("published"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = await paginateProducts(ctx, args, args.draftStatus ?? "published");
    return {
      ...result,
      page: await Promise.all(result.page.map((product) => resolveProductWithCategory(ctx, product))),
    };
  },
});


export const getByShelfCode = query({
  args: { shelfCode: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db
      .query("products")
      .withIndex("by_shelfCode", (index) => index.eq("shelfCode", args.shelfCode.trim()))
      .first();

    return product ? await resolveProductWithCategory(ctx, product) : null;
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
    const requestedLimit = args.limit === undefined
      ? undefined
      : Math.min(300, Math.max(1, Math.floor(args.limit)));
    let items: Doc<"products">[] = [];

    if (args.categoryId) {
      items = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId!))
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(requestedLimit ?? 200);
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
          .take(requestedLimit ?? 200);
      } else {
        items = [];
      }
    } else if (args.brand) {
      items = await ctx.db
        .query("products")
        .withIndex("by_brand", (q) => q.eq("brand", args.brand!))
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(requestedLimit ?? 200);
    } else {
      items = await ctx.db
        .query("products")
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(requestedLimit ?? 300);
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
    const limit = Math.min(50, Math.max(1, Math.floor(args.limit ?? 12)));
    const items = await ctx.db
      .query("products")
      .filter((q) => q.neq(q.field("isDraft"), true))
      .take(limit);

    return await Promise.all(items.map((p) => resolvePublicProduct(ctx, p)));
  },
});

export const listPublicSitemapEntries = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("products")
      .filter((q) => q.neq(q.field("isDraft"), true))
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((product) => ({
        slug: product.slug,
        lastModified: product.updatedAt ?? product.createdAt,
      })),
    };
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

async function adjustStats(
  ctx: MutationCtx,
  delta: { total?: number; drafts?: number; published?: number; outOfStock?: number }
) {
  const stats = await ctx.db
    .query("stats")
    .withIndex("by_key", (q) => q.eq("key", "products"))
    .first();

  if (!stats) return;

  await ctx.db.patch(stats._id, {
    total: Math.max(0, stats.total + (delta.total ?? 0)),
    drafts: Math.max(0, stats.drafts + (delta.drafts ?? 0)),
    published: Math.max(0, stats.published + (delta.published ?? 0)),
    outOfStock: Math.max(0, (stats.outOfStock ?? 0) + (delta.outOfStock ?? 0)),
    updatedAt: Date.now(),
  });
}

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
    await requireAdmin(ctx);
    const now = Date.now();
    const isDraft = args.isDraft ?? true;
    const newId = await ctx.db.insert("products", {
      ...args,
      isDraft,
      createdAt: now,
      updatedAt: now,
    });
    await adjustStats(ctx, {
      total: 1,
      drafts: isDraft ? 1 : 0,
      published: !isDraft ? 1 : 0,
      outOfStock: !args.inStock ? 1 : 0,
    });
    return newId;
  },
});

export const createDraftBatch = mutation({
  args: {
    products: v.array(v.object({
      shelfCode: v.optional(v.string()),
      brand: v.optional(v.string()),
      categoryId: v.optional(v.id("categories")),
      images: v.array(v.string()),
    })),
  },
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const product of args.products) {
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
          if (existing.isDraft === true) {
            const contextPatch: {
              brand?: string;
              categoryId?: typeof product.categoryId;
            } = {};
            if ((!existing.brand || existing.brand === "Genel Uyumlu") && product.brand?.trim()) {
              contextPatch.brand = product.brand.trim();
            }
            if (!existing.categoryId && product.categoryId) {
              contextPatch.categoryId = product.categoryId;
            }
            if (Object.keys(contextPatch).length > 0) {
              await ctx.db.patch(existing._id, { ...contextPatch, updatedAt: now });
            }
          }
          skipped += 1;
          continue;
        }
      }

      await ctx.db.insert("products", {
        title: "",
        slug: "",
        oemNumber: "",
        shelfCode,
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
        brand: product.brand || "",
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

    if (created > 0) {
      await adjustStats(ctx, {
        total: created,
        drafts: created,
        outOfStock: created,
      });
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
    await requireAdmin(ctx);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);

    let deltaDrafts = 0;
    let deltaPublished = 0;
    let deltaOutOfStock = 0;

    if (existing && args.isDraft !== undefined && existing.isDraft !== args.isDraft) {
      if (args.isDraft) {
        deltaDrafts = 1;
        deltaPublished = -1;
      } else {
        deltaDrafts = -1;
        deltaPublished = 1;
      }
    }

    if (existing && args.inStock !== undefined && existing.inStock !== args.inStock) {
      if (!args.inStock) {
        deltaOutOfStock = 1;
      } else {
        deltaOutOfStock = -1;
      }
    }

    if (deltaDrafts !== 0 || deltaPublished !== 0 || deltaOutOfStock !== 0) {
      await adjustStats(ctx, {
        drafts: deltaDrafts,
        published: deltaPublished,
        outOfStock: deltaOutOfStock,
      });
    }

    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const toggleStock = mutation({
  args: { id: v.id("products"), inStock: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing && existing.inStock !== args.inStock) {
      await adjustStats(ctx, {
        outOfStock: args.inStock ? -1 : 1,
      });
    }
    await ctx.db.patch(args.id, {
      inStock: args.inStock,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (existing) {
      await adjustStats(ctx, {
        total: -1,
        drafts: existing.isDraft ? -1 : 0,
        published: !existing.isDraft ? -1 : 0,
        outOfStock: !existing.inStock ? -1 : 0,
      });
      await ctx.db.delete(args.id);
    }
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("stats")
      .withIndex("by_key", (q) => q.eq("key", "products"))
      .first();
    return stats ?? null;
  },
});

export const syncProductStats = mutation({
  args: {},
  handler: async (ctx) => {
    let total = 0;
    let drafts = 0;
    let published = 0;
    let outOfStock = 0;

    for await (const p of ctx.db.query("products")) {
      total++;
      if (p.isDraft === true) {
        drafts++;
      } else {
        published++;
      }
      if (!p.inStock) {
        outOfStock++;
      }
    }

    const existing = await ctx.db
      .query("stats")
      .withIndex("by_key", (q) => q.eq("key", "products"))
      .first();

    const data = {
      total,
      drafts,
      published,
      outOfStock,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("stats", {
        key: "products",
        ...data,
      });
    }

    return data;
  },
});
