import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authz";

export const getContactSettings = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "contact"))
      .first();

    if (!doc) {
      return {
        phoneNumber: "",
        email: "",
        workingHours: "",
        address: "",
        city: "",
        district: "",
        postalCode: "",
        updatedAt: undefined,
      };
    }

    return {
      phoneNumber: doc.phoneNumber || "",
      email: doc.email || "",
      workingHours: doc.workingHours || "",
      address: doc.address || "",
      city: doc.city || "",
      district: doc.district || "",
      postalCode: doc.postalCode || "",
      updatedAt: doc.updatedAt,
    };
  },
});

export const updateContactSettings = mutation({
  args: {
    phoneNumber: v.string(),
    email: v.string(),
    workingHours: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    postalCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const phoneNumber = args.phoneNumber.trim();
    const email = args.email.trim();
    const workingHours = args.workingHours.trim();
    const address = args.address.trim();
    const city = args.city?.trim() || "";
    const district = args.district?.trim() || "";
    const postalCode = args.postalCode?.trim() || "";

    if (!phoneNumber) throw new Error("Telefon numarası boş bırakılamaz.");
    if (!email) throw new Error("E-posta adresi boş bırakılamaz.");
    if (!address) throw new Error("Adres boş bırakılamaz.");

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "contact"))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phoneNumber,
        email,
        workingHours,
        address,
        city,
        district,
        postalCode,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("siteSettings", {
        key: "contact",
        phoneNumber,
        email,
        workingHours,
        address,
        city,
        district,
        postalCode,
        updatedAt: now,
      });
    }
  },
});
