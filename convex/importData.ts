import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Standard Categories
export const STANDARD_CATEGORIES = [
  { name: "Motor Beyinleri (ECU)", slug: "motor-beyinleri-ecu", order: 1, desc: "Tüm araç markalarına ait orijinal test edilmiş motor kontrol üniteleri (ECU)." },
  { name: "ABS / ESP Beyinleri", slug: "abs-esp-beyinleri", order: 2, desc: "ABS hidrolik blok ve elektronik kontrol üniteleri." },
  { name: "Gösterge Panelleri", slug: "gosterge-panelleri", order: 3, desc: "KM saatleri, dijital ve analog gösterge panelleri." },
  { name: "Sigorta Kutuları", slug: "sigorta-kutulari", order: 4, desc: "Motor içi ve gövde sigorta dağıtım kutuları." },
  { name: "Kumanda Panel ve Düğmeler", slug: "kumanda-panel-ve-dugmeler", order: 5, desc: "Cam açma düğmeleri, klima panelleri ve kontrol üniteleri." },
  { name: "BCM / BSI Modülleri", slug: "bcm-bsi-sam-modulleri", order: 6, desc: "Gövde kontrol modülleri, BSI, BCM, SAM ve UCH üniteleri." },
  { name: "Airbag Beyinleri", slug: "airbag-beyinleri", order: 7, desc: "Hava yastığı sensör ve kontrol modülleri." },
  { name: "Direksiyon & Sinyal Kolları", slug: "direksiyon-kumanda-modulleri", order: 8, desc: "Sinyal, silecek ve direksiyon kumanda kolları." },
  { name: "Kontak & Çalıştırma Sistemleri", slug: "konfor-modulleri", order: 9, desc: "Kontak kilitleri, start-stop modülleri ve immobilizer sistemleri." },
  { name: "Multimedya Üniteleri", slug: "multimedya-uniteleri", order: 10, desc: "Orijinal teyp, radyo, ekran ve navigasyon üniteleri." },
  { name: "Cam & Ayna Motorları", slug: "cam-kapi-motorlari", order: 11, desc: "Elektrikli cam krikoları ve kapı/ayna motorları." },
  { name: "ECU Motor Beyin Setleri", slug: "ecu-motor-beyin-setleri", order: 12, desc: "Anahtar, kontak, BSI ve ECU setleri." },
  { name: "Direksiyon & Pompa", slug: "direksiyon-pompa", order: 13, desc: "Elektrikli direksiyon pompaları ve kolon modülleri." },
  { name: "Oto Elektronik Parçaları", slug: "oto-elektronik-genel", order: 14, desc: "Çeşitli sensör, soket, trim ve elektronik yedek parçalar." },
];

// Standard Popular Brands
export const STANDARD_BRANDS = [
  { name: "Mercedes-Benz", slug: "mercedes-benz", logo: "https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg", order: 1 },
  { name: "BMW", slug: "bmw", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg", order: 2 },
  { name: "Audi", slug: "audi", logo: "https://upload.wikimedia.org/wikipedia/commons/9/92/Audi-Logo_2016.svg", order: 3 },
  { name: "Volkswagen", slug: "volkswagen", logo: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg", order: 4 },
  { name: "Renault", slug: "renault", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Renault_2021_Textlogo.svg", order: 5 },
  { name: "Fiat", slug: "fiat", logo: "https://upload.wikimedia.org/wikipedia/commons/1/12/Fiat_Automobiles_logo.svg", order: 6 },
  { name: "Opel", slug: "opel", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Opel_2020.svg", order: 7 },
  { name: "Ford", slug: "ford", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Ford_Motor_Company_Logo.svg", order: 8 },
  { name: "Peugeot", slug: "peugeot", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Peugeot_2021.svg", order: 9 },
  { name: "Citroën", slug: "citroen", logo: "https://upload.wikimedia.org/wikipedia/commons/a/af/Citro%C3%ABn_2022.svg", order: 10 },
  { name: "Hyundai", slug: "hyundai", logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Hyundai_Motor_Company_logo.svg", order: 11 },
  { name: "Toyota", slug: "toyota", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Toyota.svg", order: 12 },
  { name: "Honda", slug: "honda", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Honda_Logo.svg", order: 13 },
  { name: "Nissan", slug: "nissan", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Nissan_2020_logo.svg", order: 14 },
  { name: "Volvo", slug: "volvo", logo: "https://upload.wikimedia.org/wikipedia/commons/8/80/Volvo_logo_2021.svg", order: 15 },
  { name: "Skoda", slug: "skoda", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Skoda_Auto_logo_%282023%29.svg", order: 16 },
  { name: "Seat", slug: "seat", logo: "https://upload.wikimedia.org/wikipedia/commons/4/47/SEAT_Logo_2017.svg", order: 17 },
  { name: "Kia", slug: "kia", logo: "https://upload.wikimedia.org/wikipedia/commons/4/47/KIA_logo2.svg", order: 18 },
];

// Clean all products in batches of 500
export const cleanProductsBatch = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 500;
    const products = await ctx.db.query("products").take(limit);
    for (const p of products) {
      await ctx.db.delete(p._id);
    }
    return { deleted: products.length, remaining: products.length === limit };
  },
});

// Ensure Categories & Brands
export const initCategoriesAndBrands = mutation({
  args: {},
  handler: async (ctx) => {
    const existingCats = await ctx.db.query("categories").collect();
    const categoryMap: Record<string, string> = {};

    for (const cat of existingCats) {
      categoryMap[cat.slug] = cat._id;
    }

    for (const req of STANDARD_CATEGORIES) {
      if (!categoryMap[req.slug]) {
        const id = await ctx.db.insert("categories", {
          name: req.name,
          slug: req.slug,
          description: req.desc,
          order: req.order,
          isActive: true,
        });
        categoryMap[req.slug] = id;
      }
    }

    const existingBrands = await ctx.db.query("brands").collect();
    const brandMap: Record<string, string> = {};

    for (const b of existingBrands) {
      brandMap[b.slug] = b._id;
    }

    for (const b of STANDARD_BRANDS) {
      if (!brandMap[b.slug]) {
        const id = await ctx.db.insert("brands", {
          name: b.name,
          slug: b.slug,
          logoUrl: b.logo,
          popular: true,
          order: b.order,
          isActive: true,
        });
        brandMap[b.slug] = id;
      }
    }

    return { categoryMap };
  },
});

// Bulk Insert Formatted Products
export const batchInsertProducts = mutation({
  args: {
    products: v.array(
      v.object({
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
        needsReview: v.optional(v.boolean()),
        reviewReason: v.optional(v.string()),
        oemSource: v.optional(v.union(
          v.literal("image"),
          v.literal("web"),
          v.literal("manual"),
          v.literal("unresolved")
        )),
        visibleOemNumber: v.optional(v.string()),
        reviewCodes: v.optional(v.array(v.object({
          code: v.string(),
          kind: v.union(v.literal("oem_candidate"), v.literal("secondary_code")),
          source: v.optional(v.union(
            v.literal("image"),
            v.literal("web"),
            v.literal("manual"),
            v.literal("unresolved")
          )),
          confidence: v.optional(v.number()),
          evidence: v.optional(v.string()),
        }))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;

    for (const p of args.products) {
      await ctx.db.insert("products", {
        ...p,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }

    return { inserted };
  },
});

// Idempotent importer write: update a product with the same shelf code instead of duplicating it.
export const upsertProductsByShelfCode = mutation({
  args: {
    products: v.array(
      v.object({
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
        needsReview: v.optional(v.boolean()),
        reviewReason: v.optional(v.string()),
        oemSource: v.optional(v.union(
          v.literal("image"),
          v.literal("web"),
          v.literal("manual"),
          v.literal("unresolved")
        )),
        visibleOemNumber: v.optional(v.string()),
        reviewCodes: v.optional(v.array(v.object({
          code: v.string(),
          kind: v.union(v.literal("oem_candidate"), v.literal("secondary_code")),
          source: v.optional(v.union(
            v.literal("image"),
            v.literal("web"),
            v.literal("manual"),
            v.literal("unresolved")
          )),
          confidence: v.optional(v.number()),
          evidence: v.optional(v.string()),
        }))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    for (const product of args.products) {
      const existing = product.shelfCode
        ? await ctx.db
          .query("products")
          .withIndex("by_shelfCode", (q) => q.eq("shelfCode", product.shelfCode))
          .first()
        : null;

      if (existing) {
        await ctx.db.patch(existing._id, { ...product, updatedAt: now });
        updated++;
      } else {
        await ctx.db.insert("products", { ...product, createdAt: now, updatedAt: now });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});
