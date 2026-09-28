import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type AuthContext = ActionCtx | MutationCtx | QueryCtx;

export async function hasAdminAccess(ctx: AuthContext) {
  const userId = await getAuthUserId(ctx);
  return Boolean(userId);
}

export async function requireAdmin(ctx: AuthContext) {
  if (!(await hasAdminAccess(ctx))) {
    throw new Error("Yetkisiz erişim.");
  }
}
