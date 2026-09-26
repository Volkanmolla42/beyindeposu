import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let cats;
    if (args.onlyActive !== false) {
      cats = await ctx.db
        .query("categories")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();
    } else {
      cats = await ctx.db.query("categories").collect();
    }

    const sorted = cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Resolve Convex Storage image URL or fallback to local imageUrl
    return await Promise.all(
      sorted.map(async (c) => {
        let imageUrl: string | null = null;
        if (c.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(c.imageStorageId);
        }
        return {
          ...c,
          image: imageUrl || c.imageUrl || undefined,
        };
      })
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const cat = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!cat) return null;

    let imageUrl: string | null = null;
    if (cat.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(cat.imageStorageId);
    }

    return {
      ...cat,
      image: imageUrl || cat.imageUrl || undefined,
    };
  },
});

export const getById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.id);
    if (!cat) return null;

    let imageUrl: string | null = null;
    if (cat.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(cat.imageStorageId);
    }

    return {
      ...cat,
      image: imageUrl || cat.imageUrl || undefined,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) {
      throw new Error(`'${args.slug}' slug'ına sahip bir kategori zaten mevcut.`);
    }

    const now = Date.now();
    return await ctx.db.insert("categories", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    order: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    
    // If the storage ID changed, delete the old storage file to save space
    if (existing?.imageStorageId && fields.imageStorageId && existing.imageStorageId !== fields.imageStorageId) {
      await ctx.storage.delete(existing.imageStorageId);
    }

    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const setImageStorageId = mutation({
  args: {
    id: v.id("categories"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.id);
    if (!cat) return;
    if (cat.imageStorageId && cat.imageStorageId !== args.storageId) {
      await ctx.storage.delete(cat.imageStorageId);
    }
    await ctx.db.patch(args.id, {
      imageStorageId: args.storageId,
      updatedAt: Date.now(),
    });
  },
});

export const bulkSetCategoryStorageIds = mutation({
  args: {
    updates: v.array(
      v.object({
        slug: v.string(),
        storageId: v.id("_storage"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("categories").collect();
    const catBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c]));
    let count = 0;

    for (const update of args.updates) {
      const cat = catBySlug.get(update.slug.toLowerCase());
      if (cat) {
        if (cat.imageStorageId && cat.imageStorageId !== update.storageId) {
          await ctx.storage.delete(cat.imageStorageId);
        }
        await ctx.db.patch(cat._id, {
          imageStorageId: update.storageId,
          updatedAt: Date.now(),
        });
        count++;
      }
    }
    return { updatedCount: count };
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.id);
    if (!cat) return;

    const productsInCategory = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .take(1);

    if (productsInCategory.length > 0) {
      throw new Error("Bu kategoriye bağlı ürünler bulunmaktadır. Önce ürünlerin kategorisini değiştiriniz veya ürünleri siliniz.");
    }

    if (cat.imageStorageId) {
      await ctx.storage.delete(cat.imageStorageId);
    }

    await ctx.db.delete(args.id);
  },
});

export const INITIAL_CATEGORIES = [
  {
    name: "Motor Beyinleri (ECU)",
    slug: "motor-beyinleri-ecu",
    order: 1,
    imageUrl: "/images/cat-ecu.jpg",
    description: "Motor kontrol üniteleri (ECU / ECM), enjeksiyon ve ateşleme yönetim modülleri.",
  },
  {
    name: "ABS / ESP Beyinleri",
    slug: "abs-esp-beyinleri",
    order: 2,
    imageUrl: "/images/cat-abs.jpg",
    description: "ABS hidrolik pompaları, ESP kontrol modülleri ve fren elektronik üniteleri.",
  },
  {
    name: "Airbag Beyinleri",
    slug: "airbag-beyinleri",
    order: 3,
    imageUrl: "/images/cat-airbag.jpg",
    description: "Hava yastığı kontrol modülleri, SRS ve çarpışma sensör beyinleri.",
  },
  {
    name: "BCM / BSI Beyinleri",
    slug: "bcm-bsi-sam-modulleri",
    order: 4,
    imageUrl: "/images/cat-bcm.jpg",
    description: "Gövde kontrol üniteleri (BCM), BSI ve konfor yönetim modülleri.",
  },
  {
    name: "UCH / SAM Modülleri",
    slug: "uch-sam-modulleri",
    order: 5,
    imageUrl: "/images/cat-uch.jpg",
    description: "Renault UCH, Mercedes SAM ve araç içi merkezi kontrol modülleri.",
  },
  {
    name: "Sigorta Kutuları",
    slug: "sigorta-kutulari",
    order: 6,
    imageUrl: "/images/cat-fusebox.jpg",
    description: "Motor içi ve kabin içi elektronik sigorta ve röle dağıtım kutuları.",
  },
  {
    name: "Gösterge Panelleri",
    slug: "gosterge-panelleri",
    order: 7,
    imageUrl: "/images/cat-cluster.jpg",
    description: "Dijital ve analog gösterge kadranları, cluster ekranları.",
  },
  {
    name: "Direksiyon Kumanda Modülleri",
    slug: "direksiyon-kumanda-modulleri",
    order: 8,
    imageUrl: "/images/cat-steering.jpg",
    description: "Direksiyon açı sensörleri, korna sargıları ve direksiyon altı silecek/sinyal kolları.",
  },
  {
    name: "Direksiyon Kolon & Pompa",
    slug: "direksiyon-kolon-pompa",
    order: 9,
    imageUrl: "/images/cat-steering-pump.jpg",
    description: "Elektrikli direksiyon kolonları, hidrolik ve elektronik direksiyon pompaları.",
  },
  {
    name: "Klima Kontrol Üniteleri",
    slug: "klima-kontrol-uniteleri",
    order: 10,
    imageUrl: "/images/cat-climate.jpg",
    description: "Dijital ve manuel klima kontrol panelleri ve modülleri.",
  },
  {
    name: "Multimedya Üniteleri",
    slug: "multimedya-uniteleri",
    order: 11,
    imageUrl: "/images/cat-multimedia.jpg",
    description: "Orijinal fabrika çıkışlı navigasyon, teyp ve multimedya ekranları.",
  },
  {
    name: "Konfor Modülleri",
    slug: "konfor-modulleri",
    order: 12,
    imageUrl: "/images/cat-comfort.jpg",
    description: "Kapı, cam ve tavan konfor elektronik modülleri.",
  },
  {
    name: "Şanzıman Beyinleri",
    slug: "sanziman-beyinleri",
    order: 13,
    imageUrl: "/images/cat-transmission.jpg",
    description: "Otomatik ve çift kavramalı şanzıman mekatronik ve elektronik kontrol üniteleri.",
  },
  {
    name: "ECU Beyin Setleri",
    slug: "ecu-setleri",
    order: 14,
    imageUrl: "/images/cat-ecu-kit.jpg",
    description: "Motor beyni, kontak, immobilizer ve anahtar komple setleri.",
  },
  {
    name: "Cam Motorları",
    slug: "cam-motorlari",
    order: 15,
    imageUrl: "/images/cat-window-motor.jpg",
    description: "Ön ve arka elektrikli cam krikoları ve cam motorları.",
  },
  {
    name: "Kumanda Panel ve Düğmeler",
    slug: "kumanda-panel-ve-dugmeler",
    order: 16,
    imageUrl: "/images/cat-switches.jpg",
    description: "Cam açma düğmeleri, ayna ayar anahtarları ve iç kontrol butonları.",
  },
  {
    name: "Diğer Elektronik Parçalar",
    slug: "diger-elektronik-parcalar",
    order: 17,
    imageUrl: "/images/cat-electronics.jpg",
    description: "Sensörler, valfler, trim elektronik parçaları ve genel oto elektrik aksamı.",
  },
];

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").collect();
    const existingBySlug = new Map(existing.map((c) => [c.slug.toLowerCase(), c]));
    let created = 0;
    let updated = 0;
    const now = Date.now();

    for (const item of INITIAL_CATEGORIES) {
      const found = existingBySlug.get(item.slug.toLowerCase());
      if (!found) {
        await ctx.db.insert("categories", {
          name: item.name,
          slug: item.slug,
          order: item.order,
          imageUrl: item.imageUrl,
          description: item.description,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      } else {
        await ctx.db.patch(found._id, {
          order: item.order,
          imageUrl: item.imageUrl,
          description: found.description || item.description,
          updatedAt: now,
        });
        updated++;
      }
    }

    return { created, updated, total: INITIAL_CATEGORIES.length };
  },
});
