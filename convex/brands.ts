import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const brands = await ctx.db.query("brands").collect();
    return brands.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  },
});

export const getPopular = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("brands")
      .withIndex("by_popular", (q) => q.eq("popular", true))
      .take(50);
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    popular: v.boolean(),
    order: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("brands", {
      ...args,
      isActive: args.isActive ?? true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("brands"),
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    popular: v.boolean(),
    order: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, {
      ...data,
      isActive: data.isActive ?? true,
    });
  },
});

export const deleteBrand = mutation({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 31+ Comprehensive brand catalog with local codebase SVG paths
export const INITIAL_BRANDS = [
  { name: "Renault", slug: "renault", logoUrl: "/images/brands/renault.svg", order: 1 },
  { name: "Volkswagen", slug: "volkswagen", logoUrl: "/images/brands/volkswagen.svg", order: 2 },
  { name: "Mercedes-Benz", slug: "mercedes-benz", logoUrl: "/images/brands/mercedes-benz.svg", order: 3 },
  { name: "BMW", slug: "bmw", logoUrl: "/images/brands/bmw.svg", order: 4 },
  { name: "Audi", slug: "audi", logoUrl: "/images/brands/audi.svg", order: 5 },
  { name: "Ford", slug: "ford", logoUrl: "/images/brands/ford.svg", order: 6 },
  { name: "Peugeot", slug: "peugeot", logoUrl: "/images/brands/peugeot.svg", order: 7 },
  { name: "Citroën", slug: "citroen", logoUrl: "/images/brands/citroen.svg", order: 8 },
  { name: "Fiat", slug: "fiat", logoUrl: "/images/brands/fiat.svg", order: 9 },
  { name: "Opel", slug: "opel", logoUrl: "/images/brands/opel.svg", order: 10 },
  { name: "Seat", slug: "seat", logoUrl: "/images/brands/seat.svg", order: 11 },
  { name: "Skoda", slug: "skoda", logoUrl: "/images/brands/skoda.svg", order: 12 },
  { name: "Toyota", slug: "toyota", logoUrl: "/images/brands/toyota.svg", order: 13 },
  { name: "Hyundai", slug: "hyundai", logoUrl: "/images/brands/hyundai.svg", order: 14 },
  { name: "Honda", slug: "honda", logoUrl: "/images/brands/honda.svg", order: 15 },
  { name: "Nissan", slug: "nissan", logoUrl: "/images/brands/nissan.svg", order: 16 },
  { name: "Volvo", slug: "volvo", logoUrl: "/images/brands/volvo.svg", order: 17 },
  { name: "Kia", slug: "kia", logoUrl: "/images/brands/kia.svg", order: 18 },
  { name: "Dacia", slug: "dacia", logoUrl: "/images/brands/dacia.svg", order: 19 },
  { name: "Alfa Romeo", slug: "alfa-romeo", logoUrl: "/images/brands/alfa-romeo.svg", order: 20 },
  { name: "Porsche", slug: "porsche", logoUrl: "/images/brands/porsche.svg", order: 21 },
  { name: "Land Rover", slug: "land-rover", logoUrl: "/images/brands/land-rover.svg", order: 22 },
  { name: "Jaguar", slug: "jaguar", logoUrl: "/images/brands/jaguar.svg", order: 23 },
  { name: "Mitsubishi", slug: "mitsubishi", logoUrl: "/images/brands/mitsubishi.svg", order: 24 },
  { name: "Chevrolet", slug: "chevrolet", logoUrl: "/images/brands/chevrolet.svg", order: 25 },
  { name: "Suzuki", slug: "suzuki", logoUrl: "/images/brands/suzuki.svg", order: 26 },
  { name: "Mini", slug: "mini", logoUrl: "/images/brands/mini.svg", order: 27 },
  { name: "Mazda", slug: "mazda", logoUrl: "/images/brands/mazda.svg", order: 28 },
  { name: "Jeep", slug: "jeep", logoUrl: "/images/brands/jeep.svg", order: 29 },
  { name: "Iveco", slug: "iveco", logoUrl: "/images/brands/iveco.svg", order: 30 },
  { name: "Subaru", slug: "subaru", logoUrl: "/images/brands/subaru.svg", order: 31 },
];

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("brands").collect();
    const existingBySlug = new Map(existing.map((b) => [b.slug.toLowerCase(), b]));
    let created = 0;
    let updated = 0;

    for (const item of INITIAL_BRANDS) {
      const found = existingBySlug.get(item.slug.toLowerCase());
      if (!found) {
        await ctx.db.insert("brands", {
          name: item.name,
          slug: item.slug,
          logoUrl: item.logoUrl,
          order: item.order,
          popular: false,
          isActive: true,
        });
        created++;
      } else {
        // Update logo to point to local codebase path if needed
        await ctx.db.patch(found._id, {
          logoUrl: item.logoUrl,
          order: item.order,
        });
        updated++;
      }
    }

    return { created, updated, total: INITIAL_BRANDS.length };
  },
});
