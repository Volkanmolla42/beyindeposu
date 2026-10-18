import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authz";

const DEFAULT_SETTINGS = {
  phoneNumber: "0530 906 70 34",
  email: "beyindeposu34@gmail.com",
  workingHours: "Her gün: 08:30 - 18:00",
  address: "Maltepe, Yedikule Çırpıcı Yolu Topkapı Ticaret Merkezi D:1st Section B Blok,126, 34010 Zeytinburnu/İstanbul",
};

export const getContactSettings = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "contact"))
      .first();

    if (!doc) {
      return {
        ...DEFAULT_SETTINGS,
        updatedAt: undefined,
      };
    }

    return {
      phoneNumber: doc.phoneNumber || DEFAULT_SETTINGS.phoneNumber,
      email: doc.email || DEFAULT_SETTINGS.email,
      workingHours: doc.workingHours || DEFAULT_SETTINGS.workingHours,
      address: doc.address || DEFAULT_SETTINGS.address,
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const phoneNumber = args.phoneNumber.trim();
    const email = args.email.trim();
    const workingHours = args.workingHours.trim();
    const address = args.address.trim();

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
        updatedAt: now,
      });
    }
  },
});
