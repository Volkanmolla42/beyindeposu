import { sanitizeTurkishText } from "@/lib/utils";

export interface ProductFileGroup {
  id: string;
  shelfCode: string;
  categoryHint: string;
  brandHint: string;
  folderPath: string;
  files: File[];
  status: "idle" | "processing" | "success" | "skipped" | "error";
  error?: string;
  result?: {
    productId?: string;
    oemNumber?: string;
    title?: string;
    brand?: string;
    model?: string;
    imageUrl?: string;
  };
}

export function groupProductFiles(files: File[]) {
  const groupsMap = new Map<string, File[]>();

  let rootName = "Seçilen Klasör";

  for (const file of files) {
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split("/");

    if (parts.length > 1) {
      rootName = parts[0];
      // Dosyanın bulunduğu klasör ve raf kodu tespiti
      const dirParts = parts.slice(0, parts.length - 1);
      const shelfMatch = file.name.match(/^(\d{3}(?:\.\d{2})?\.\d{3,4})/);
      const isShelfFolder =
        shelfMatch && dirParts[dirParts.length - 1] === shelfMatch[1];
      const effectiveParts =
        !isShelfFolder && shelfMatch ? [...dirParts, shelfMatch[1]] : dirParts;
      const folderKey = effectiveParts.join("/");

      // Sadece görsel dosyalarını al
      if (/\.(webp|jpg|jpeg|png)$/i.test(file.name)) {
        const groupFiles = groupsMap.get(folderKey) ?? [];
        groupFiles.push(file);
        groupsMap.set(folderKey, groupFiles);
      }
    }
  }

  // Grupları ProductFileGroup array'ine çevir
  const newGroups: ProductFileGroup[] = [];

  groupsMap.forEach((files, key) => {
    const segments = key.split("/");
    const shelfCode = segments[segments.length - 1] || "GENEL";
    const categoryHint = sanitizeTurkishText(
      segments.length > 2 ? segments[1] : "Oto Elektronik",
    );
    const brandHint = sanitizeTurkishText(
      segments.length > 3 ? segments[2].replace(/^[0-9.]+\s*/, "") : "Genel",
    );

    // Görselleri doğal sıraya göre diz (.1_ veya .1. önce gelsin)
    files.sort((a, b) => {
      const aFirst = a.name.includes(".1.") || a.name.includes(".1_");
      const bFirst = b.name.includes(".1.") || b.name.includes(".1_");
      if (aFirst && !bFirst) return -1;
      if (!aFirst && bFirst) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    newGroups.push({
      id: key,
      shelfCode,
      categoryHint,
      brandHint,
      folderPath: key,
      files,
      status: "idle",
    });
  });

  return { rootName, groups: newGroups };
}

// Helper: Slugify
export const importSlug = (text: string) => {
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => trMap[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};
