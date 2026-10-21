import { mutation, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./authz";

export async function storageUrl(ctx: QueryCtx, storageId: Id<"_storage">) {
  return (await ctx.storage.getUrl(storageId)) ?? "";
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
