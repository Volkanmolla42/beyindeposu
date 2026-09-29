import type { Id } from "@convex/_generated/dataModel";

export type FolderProductGroup = {
  key: string;
  shelfCode?: string;
  brandHint?: string;
  categoryId?: Id<"categories">;
  files: File[];
  uploadedUrls: string[];
};

export type FolderUploadProgress = {
  stage: "uploading" | "done" | "error";
  totalProducts: number;
  completedProducts: number;
  totalImages: number;
  uploadedImages: number;
  skippedProducts: number;
  error?: string;
};

export const slugifyText = (text: string): string => {
  const trMap: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => trMap[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const CATEGORY_FOLDER_ALIASES: Record<string, string[]> = {
  "motor-beyinleri-ecu": ["ecu", "ecm"],
  "abs-esp-beyinleri": ["abs", "esp"],
  "airbag-beyinleri": ["airbag", "srs"],
  "bcm-bsi-sam-modulleri": ["bcm", "bsi", "sam"],
  "uch-sam-modulleri": ["uch", "sam"],
  "sigorta-kutulari": ["sigorta", "fuse"],
};

const IGNORED_CATEGORY_TOKENS = new Set([
  "beyin", "beyinleri", "modul", "modulleri", "unitesi", "uniteleri",
  "kontrol", "kutusu", "kutulari", "paneli", "panelleri",
]);

const segmentTokens = (segment: string) => slugifyText(segment).split("-").filter(Boolean);

/**
 * Seçilen klasördeki görselleri dizin hiyerarşisi, marka ve kategori eşleştirmesine göre gruplar.
 */
export function groupFolderImages(
  files: File[],
  brandOptions: Array<{ name: string; slug: string }>,
  categoryOptions: Array<{ _id: Id<"categories">; name: string; slug: string }>,
): FolderProductGroup[] {
  const byDirectory = new Map<string, { file: File; stem: string }[]>();

  for (const file of files) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file.name)) continue;

    const pathParts = (file.webkitRelativePath || file.name).split(/[\\/]/).filter(Boolean);
    const fileName = pathParts[pathParts.length - 1] || file.name;
    const directoryParts = pathParts.length > 1 ? pathParts.slice(1, -1) : [];
    const directory = directoryParts.join("/");
    let stem = fileName;
    while (/\.(jpe?g|png|webp|avif)$/i.test(stem)) {
      stem = stem.replace(/\.(jpe?g|png|webp|avif)$/i, "");
    }
    stem = stem.replace(/_resized$/i, "");
    const siblings = byDirectory.get(directory) || [];
    siblings.push({ file, stem });
    byDirectory.set(directory, siblings);
  }

  const groups = new Map<string, FolderProductGroup>();
  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

  for (const [directory, siblings] of byDirectory) {
    const directoryParts = directory.split("/").filter(Boolean);
    const normalizedSegments = directoryParts.map((segment) => slugifyText(segment));
    const matchedBrand = [...brandOptions]
      .sort((a, b) => slugifyText(b.name).length - slugifyText(a.name).length)
      .find((option) => {
        const brandSlug = slugifyText(option.name);
        const brandTokens = brandSlug.split("-").filter(Boolean);
        return normalizedSegments.some((segment) => {
          if (segment === brandSlug || segment === option.slug) return true;
          const tokens = segmentTokens(segment);
          if (brandTokens.length > 1) {
            return brandTokens.every((token) => tokens.includes(token));
          }
          return tokens.includes(brandSlug);
        });
      });

    const matchedCategory = [...normalizedSegments].reverse().reduce<
      Array<{ _id: Id<"categories">; name: string; slug: string }>
    >((matches, segment) => {
      if (matches.length > 0) return matches;
      const exact = categoryOptions.find((option) => (
        segment === slugifyText(option.name) || segment === option.slug
      ));
      if (exact) return [exact];
      const tokens = segmentTokens(segment);
      return categoryOptions.filter((option) => {
        const categoryTokens = segmentTokens(option.name).filter((token) => !IGNORED_CATEGORY_TOKENS.has(token));
        const aliases = CATEGORY_FOLDER_ALIASES[option.slug] || [];
        return tokens.some((token) => categoryTokens.includes(token) || aliases.includes(token));
      });
    }, [])[0];

    const folderName = directoryParts[directoryParts.length - 1] || "";
    const isCodeFolder = /^(?=.*\d)[a-z0-9]+(?:[._-][a-z0-9]+)+$/i.test(folderName);
    const isProductFolder = isCodeFolder && siblings.every(
      ({ stem }) => stem.replace(/[._ -]\d+$/, "") === folderName
    );
    const variantCounts = new Map<string, number>();
    for (const { stem } of siblings) {
      const base = stem.replace(/[._ -]\d+$/, "");
      if (base !== stem) variantCounts.set(base, (variantCounts.get(base) || 0) + 1);
    }

    for (const { file, stem } of siblings) {
      const base = stem.replace(/[._ -]\d+$/, "");
      const productCode = isProductFolder
        ? folderName
        : base !== stem && (variantCounts.get(base) || 0) > 1
          ? base
          : stem;
      const key = directory ? `${directory}/${productCode}` : productCode;
      const group = groups.get(key) || {
        key,
        shelfCode: /\d/.test(productCode) ? productCode : undefined,
        brandHint: matchedBrand?.name,
        categoryId: matchedCategory?._id,
        files: [],
        uploadedUrls: [],
      };
      group.files.push(file);
      groups.set(key, group);
    }
  }

  for (const group of groups.values()) {
    group.files.sort((a, b) => collator.compare(a.name, b.name));
  }

  return Array.from(groups.values()).sort((a, b) => collator.compare(a.key, b.key));
}
