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
  categorySlug?: string | string[];
  categoryId?: Id<"categories">;
  brand?: string | string[];
  model?: string | string[];
  condition?: string | string[];
  inStockOnly?: boolean;
  stockStatus?: "all" | "in_stock" | "out_of_stock" | Array<"in_stock" | "out_of_stock">;
  searchTerm?: string;
};

const stringSelectionValidator = v.union(v.string(), v.array(v.string()));
const MAX_FILTER_SELECTIONS = 10;
const MAX_FILTER_VALUE_LENGTH = 120;

const productFilterArgs = {
  categorySlug: v.optional(stringSelectionValidator),
  categoryId: v.optional(v.id("categories")),
  brand: v.optional(stringSelectionValidator),
  model: v.optional(stringSelectionValidator),
  condition: v.optional(stringSelectionValidator),
  inStockOnly: v.optional(v.boolean()),
  stockStatus: v.optional(v.union(
    v.literal("all"),
    v.literal("in_stock"),
    v.literal("out_of_stock"),
    v.array(v.union(v.literal("in_stock"), v.literal("out_of_stock"))),
  )),
  searchTerm: v.optional(v.string()),
};

function selectedValues(
  value?: string | string[],
  field = "Filtre",
  maxSelections = MAX_FILTER_SELECTIONS,
) {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];

  if (values.length > maxSelections) {
    throw new Error(`${field} için en fazla ${maxSelections} değer seçilebilir.`);
  }
  if (values.some((item) => item.length > MAX_FILTER_VALUE_LENGTH)) {
    throw new Error(`${field} değeri ${MAX_FILTER_VALUE_LENGTH} karakteri aşamaz.`);
  }

  return [...new Set(values.filter((item) => item && item !== "Tümü" && item !== "all"))];
}

function validateProductFilterArgs(args: ProductFilterArgs) {
  selectedValues(args.categorySlug, "Kategori");
  selectedValues(args.brand, "Marka");
  selectedValues(args.model, "Model");
  selectedValues(args.condition, "Durum");
  selectedValues(args.stockStatus, "Stok durumu", 2);

  if (args.searchTerm && args.searchTerm.length > MAX_FILTER_VALUE_LENGTH) {
    throw new Error(`Arama terimi ${MAX_FILTER_VALUE_LENGTH} karakteri aşamaz.`);
  }
}

function productQuery(
  ctx: QueryCtx,
  args: ProductFilterArgs,
  categoryIds: Id<"categories">[],
): OrderedQuery<DataModel["products"]> {
  const brands = selectedValues(args.brand);
  const models = selectedValues(args.model);

  if (categoryIds.length === 1) {
    const categoryId = categoryIds[0];
    return ctx.db.query("products")
      .withIndex("by_categoryId_and_createdAt", (q) => q.eq("categoryId", categoryId))
      .order("desc");
  }

  if (brands.length === 1) {
    const brand = brands[0];
    if (models.length === 1) {
      const model = models[0];
      return ctx.db.query("products")
        .withIndex("by_brand_and_model_and_createdAt", (q) =>
          q.eq("brand", brand).eq("model", model),
        )
        .order("desc");
    }

    return ctx.db.query("products")
      .withIndex("by_brand_and_createdAt", (q) => q.eq("brand", brand))
      .order("desc");
  }

  return ctx.db.query("products").withIndex("by_createdAt").order("desc");
}

function applyProductFilters(
  query: OrderedQuery<DataModel["products"]>,
  args: ProductFilterArgs,
  draftStatus: "all" | "draft" | "published",
  categoryIds: Id<"categories">[],
) {
  let filtered = query;

  if (draftStatus === "draft") {
    filtered = filtered.filter((q) => q.eq(q.field("isDraft"), true));
  } else if (draftStatus === "published") {
    filtered = filtered.filter((q) => q.neq(q.field("isDraft"), true));
  }

  if (categoryIds.length === 1) {
    filtered = filtered.filter((q) => q.eq(q.field("categoryId"), categoryIds[0]));
  } else if (categoryIds.length > 1) {
    filtered = filtered.filter((q) => q.or(...categoryIds.map((categoryId) => q.eq(q.field("categoryId"), categoryId))));
  }

  const brands = selectedValues(args.brand);
  if (brands.length === 1) {
    filtered = filtered.filter((q) => q.eq(q.field("brand"), brands[0]));
  } else if (brands.length > 1) {
    filtered = filtered.filter((q) => q.or(...brands.map((brand) => q.eq(q.field("brand"), brand))));
  }

  const models = selectedValues(args.model);
  if (models.length === 1) {
    filtered = filtered.filter((q) => q.eq(q.field("model"), models[0]));
  } else if (models.length > 1) {
    filtered = filtered.filter((q) => q.or(...models.map((model) => q.eq(q.field("model"), model))));
  }

  const conditions = selectedValues(args.condition);
  if (conditions.length === 1) {
    filtered = filtered.filter((q) => q.eq(q.field("condition"), conditions[0]));
  } else if (conditions.length > 1) {
    filtered = filtered.filter((q) => q.or(...conditions.map((condition) => q.eq(q.field("condition"), condition))));
  }

  const stockStatuses = selectedValues(args.stockStatus);
  if (args.inStockOnly) {
    filtered = filtered.filter((q) => q.eq(q.field("inStock"), true));
  } else if (stockStatuses.length === 1 && stockStatuses[0] === "in_stock") {
    filtered = filtered.filter((q) => q.eq(q.field("inStock"), true));
  } else if (stockStatuses.length === 1 && stockStatuses[0] === "out_of_stock") {
    filtered = filtered.filter((q) => q.eq(q.field("inStock"), false));
  }

  return filtered;
}

async function resolveCategoryIds(ctx: QueryCtx, args: ProductFilterArgs) {
  if (args.categoryId) return [args.categoryId];

  const categorySlugs = selectedValues(args.categorySlug);
  if (categorySlugs.length === 0) return [];

  const categories = await Promise.all(categorySlugs.map((slug) =>
    ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first(),
  ));
  return categories.flatMap((category) => category ? [category._id] : []);
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
  validateProductFilterArgs(args);
  const categoryIds = await resolveCategoryIds(ctx, args);
  const requestedCategoryFilter = Boolean(args.categoryId) || selectedValues(args.categorySlug).length > 0;
  if (requestedCategoryFilter && categoryIds.length === 0) {
    return emptyPaginationResult(args.paginationOpts);
  }
  const brands = selectedValues(args.brand);
  const models = selectedValues(args.model);
  if (models.length > 0 && brands.length === 0) {
    return emptyPaginationResult(args.paginationOpts);
  }

  const searchTerm = args.searchTerm?.trim();
  let query: OrderedQuery<DataModel["products"]>;

  if (searchTerm) {
    const isOemSearch = searchTerm.length >= 4 && /\d/.test(searchTerm) && !/\s/.test(searchTerm);
    const isShelfSearch = /^raf(?:$|[-_\s]|\d)/i.test(searchTerm);
    const brand = brands.length === 1 ? brands[0] : undefined;
    const model = models.length === 1 ? models[0] : undefined;
    const categoryId = categoryIds.length === 1 ? categoryIds[0] : undefined;
    const conditions = selectedValues(args.condition);
    const condition = conditions.length === 1 ? conditions[0] : undefined;
    const stockStatuses = selectedValues(args.stockStatus);
    const inStockFilter =
      args.inStockOnly || (stockStatuses.length === 1 && stockStatuses[0] === "in_stock")
        ? true
        : stockStatuses.length === 1 && stockStatuses[0] === "out_of_stock"
          ? false
          : undefined;

    if (isShelfSearch) {
      query = ctx.db.query("products").withSearchIndex("search_shelfCode", (q) => {
        let search = q.search("shelfCode", searchTerm);
        if (brand) search = search.eq("brand", brand);
        if (model) search = search.eq("model", model);
        if (categoryId) search = search.eq("categoryId", categoryId);
        if (condition) search = search.eq("condition", condition);
        if (inStockFilter !== undefined) search = search.eq("inStock", inStockFilter);
        return search;
      });
    } else if (isOemSearch) {
      query = ctx.db.query("products").withSearchIndex("search_oemNumber", (q) => {
        let search = q.search("oemNumber", searchTerm);
        if (brand) search = search.eq("brand", brand);
        if (model) search = search.eq("model", model);
        if (categoryId) search = search.eq("categoryId", categoryId);
        if (condition) search = search.eq("condition", condition);
        if (inStockFilter !== undefined) search = search.eq("inStock", inStockFilter);
        return search;
      });
    } else {
      query = ctx.db.query("products").withSearchIndex("search_title", (q) => {
        let search = q.search("title", searchTerm);
        if (brand) search = search.eq("brand", brand);
        if (model) search = search.eq("model", model);
        if (categoryId) search = search.eq("categoryId", categoryId);
        if (condition) search = search.eq("condition", condition);
        if (inStockFilter !== undefined) search = search.eq("inStock", inStockFilter);
        return search;
      });
    }
  } else {
    query = productQuery(ctx, args, categoryIds);
  }

  const filtered = applyProductFilters(query, args, draftStatus, categoryIds);
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

export const listModelsByBrand = query({
  args: { brand: stringSelectionValidator },
  handler: async (ctx, args) => {
    const brands = selectedValues(args.brand, "Marka", MAX_FILTER_SELECTIONS);
    if (brands.length === 0) return [];

    const productGroups = await Promise.all(brands.map((brand) =>
      ctx.db
        .query("products")
        .withIndex("by_brand_and_model_and_createdAt", (q) => q.eq("brand", brand))
        .order("desc")
        .filter((q) => q.neq(q.field("isDraft"), true))
        .take(1000),
    ));

    return [...new Set(
      productGroups.flat()
        .map((product) => product.model?.trim())
        .filter((model): model is string => Boolean(model)),
    )].sort((a, b) => a.localeCompare(b, "tr"));
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

export const appendImagesByOem = mutation({
  args: {
    oemNumbers: v.array(v.string()),
    images: v.array(v.string()),
    shelfCode: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      productId: v.id("products"),
      oemNumber: v.string(),
      title: v.string(),
      brand: v.string(),
      model: v.string(),
      imageUrl: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.images.length === 0) return null;

    // 1. Önce raf kodu (shelfCode) ile eşleşen ürün var mı bak
    if (args.shelfCode && args.shelfCode.trim() && args.shelfCode.trim().toUpperCase() !== "GENEL") {
      const byShelf = await ctx.db
        .query("products")
        .withIndex("by_shelfCode", (q) => q.eq("shelfCode", args.shelfCode!.trim()))
        .first();
      if (byShelf) {
        // Eski kırık görsel linklerini temizle, doğrudan yeni yüklenen görselleri ata
        await ctx.db.patch(byShelf._id, { images: args.images, updatedAt: Date.now() });
        return {
          productId: byShelf._id,
          oemNumber: byShelf.oemNumber,
          title: byShelf.title,
          brand: byShelf.brand,
          model: byShelf.model ?? "",
          imageUrl: args.images[0],
        };
      }
    }

    // 2. AI'ın tespit ettiği OEM numaraları ile eşleşen ürün var mı bak
    const normalizeOem = (value: string) =>
      value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const candidates = Array.from(
      new Set(
        args.oemNumbers.flatMap((value) => {
          const trimmed = value.trim();
          return trimmed
            ? [trimmed, trimmed.toUpperCase(), trimmed.toLowerCase()]
            : [];
        }),
      ),
    );

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeOem(candidate);
      if (!normalizedCandidate) continue;

      const matches = await ctx.db
        .query("products")
        .withIndex("by_oemNumber", (q) => q.eq("oemNumber", candidate))
        .take(20);
      const existing = matches.find(
        (product) =>
          normalizeOem(product.oemNumber) === normalizedCandidate,
      );
      if (!existing) continue;

      // Eski kırık görsel linklerini temizle, doğrudan yeni yüklenen görselleri ata
      await ctx.db.patch(existing._id, { images: args.images, updatedAt: Date.now() });

      return {
        productId: existing._id,
        oemNumber: existing.oemNumber,
        title: existing.title,
        brand: existing.brand,
        model: existing.model ?? "",
        imageUrl: args.images[0],
      };
    }

    return null;
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

    if (existing && args.isDraft !== undefined) {
      const oldIsDraft = Boolean(existing.isDraft);
      const newIsDraft = Boolean(args.isDraft);
      if (oldIsDraft !== newIsDraft) {
        if (newIsDraft) {
          deltaDrafts = 1;
          deltaPublished = -1;
        } else {
          deltaDrafts = -1;
          deltaPublished = 1;
        }
      }
    }

    if (existing && args.inStock !== undefined) {
      const oldInStock = Boolean(existing.inStock);
      const newInStock = Boolean(args.inStock);
      if (oldInStock !== newInStock) {
        deltaOutOfStock = newInStock ? -1 : 1;
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
      const isDraft = Boolean(existing.isDraft);
      const inStock = Boolean(existing.inStock);
      await adjustStats(ctx, {
        total: -1,
        drafts: isDraft ? -1 : 0,
        published: !isDraft ? -1 : 0,
        outOfStock: !inStock ? -1 : 0,
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




