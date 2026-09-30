import type { Doc } from "@convex/_generated/dataModel";
import type { OemAssistantData } from "@/lib/ai/oem-assistant";

export async function scanProductImage(
  imageUrl: string,
  categories: Doc<"categories">[] | undefined,
  brands: Doc<"brands">[] | undefined,
): Promise<OemAssistantData> {
  let base64Data = "";
  let mimeType = "image/jpeg";

  if (imageUrl.startsWith("data:")) {
    base64Data = imageUrl;
    const mimeMatch = imageUrl.match(/^data:([^;]+);base64,/);
    if (mimeMatch) mimeType = mimeMatch[1];
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Seçili görsel yüklenemedi.");
    const blob = await res.blob();
    mimeType = blob.type || "image/jpeg";
    base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const res = await fetch("/api/ai/oem-from-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64Data,
      imageMimeType: mimeType,
      categories: categories?.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
      })),
      brands: brands?.map((b) => b.name),
    }),
  });

  const data = (await res.json()) as OemAssistantData & { error?: string };
  if (!res.ok) {
    throw new Error(
      data.error || "Görselde okunabilir etiket veya OEM numarası bulunamadı.",
    );
  }

  return data;
}
