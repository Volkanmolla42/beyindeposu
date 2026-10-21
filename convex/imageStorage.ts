import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function assertValidImageStorage(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) throw new Error("Görsel bulunamadı.");
  if (!metadata.contentType || !ALLOWED_IMAGE_TYPES.has(metadata.contentType)) {
    throw new Error("Geçerli bir görsel dosyası seçin (PNG, JPG, WebP veya AVIF).");
  }
  if (metadata.size > MAX_IMAGE_SIZE) {
    throw new Error("Görsel en fazla 10 MB olabilir.");
  }
}

