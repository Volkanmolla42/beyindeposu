import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasAdminAccess } from "./authz";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => await hasAdminAccess(ctx),
});
