import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("siteSettings").first();
  },
});

export const update = mutation({
  args: {
    whatsappNumber: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("siteSettings").first();
    const payload = {
      whatsappNumber: args.whatsappNumber ?? "",
      phone: args.phone ?? "",
      email: args.email ?? "",
      workingHours: args.workingHours ?? "",
      address: args.address ?? "",
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    } else {
      return await ctx.db.insert("siteSettings", payload);
    }
  },
});
