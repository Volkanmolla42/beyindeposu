import type { Id } from "@convex/_generated/dataModel";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function uploadImageToConvex(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Geçerli bir görsel dosyası seçin (PNG, JPG, WebP veya AVIF).");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Görsel en fazla 10 MB olabilir.");
  }

  const uploadUrl = await generateUploadUrl();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Görsel yüklenemedi.");
  }

  const { storageId } = (await response.json()) as {
    storageId: Id<"_storage">;
  };
  return storageId;
}

export async function uploadLocalVideo(
  file: File,
  label?: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);

  const res = await fetch("/api/upload-video", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as {
    success: boolean;
    url?: string;
    message?: string;
  };

  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.message || "Video yüklenemedi.");
  }

  return data.url;
}
