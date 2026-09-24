/*
 * Non-destructive data.zip inventory and pilot extractor.
 *
 * The filename before the final ".<photo number>" is treated as the shelf
 * code. It is the stable stock identity; it is deliberately never replaced
 * with an OCR result.
 *
 * Examples:
 *   node scripts/prepare_data_zip_pilot.js
 *   node scripts/prepare_data_zip_pilot.js --pilot 100 --folder "KM Saatleri" --extract-pilot
 *   node scripts/prepare_data_zip_pilot.js --zip "D:\\imports\\data.zip" --out "D:\\tms-import"
 */

const AdmZip = require("adm-zip");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;
const NON_PRODUCT_FOLDERS = new Set(["site", "manifacturer", "oxyn", "data", "__MACOSX"]);

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const zipPath = readOption("--zip", process.env.TMS_DATA_ZIP || "C:\\Users\\volkan\\Desktop\\data.zip");
const outputDirectory = readOption("--out", path.join(process.cwd(), ".tms-import"));
const requestedFolder = readOption("--folder", "");
const pilotSize = Number.parseInt(readOption("--pilot", "100"), 10);
const extractPilot = hasFlag("--extract-pilot");

if (!Number.isInteger(pilotSize) || pilotSize < 1) {
  throw new Error("--pilot pozitif bir tam sayı olmalıdır.");
}

function normalize(value) {
  return value.normalize("NFC").trim().toLocaleLowerCase("tr-TR");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function parsePhoto(entryName) {
  const segments = entryName.split("/").filter(Boolean);
  const fileName = segments.at(-1);
  const extension = path.extname(fileName);
  const stem = path.basename(fileName, extension).replace(/_resized$/i, "");
  const match = stem.match(/^(.*)\.(\d+)$/);
  const shelfCode = (match?.[1] || stem).trim();
  const photoNumber = Number.parseInt(match?.[2] || "0", 10);
  const sourceFolder = segments[1] || "Bilinmeyen";
  const sourceBrandFolder = segments[2] || "";

  return {
    archivePath: entryName,
    extension: extension.toLowerCase(),
    sourceFolder,
    sourceBrandFolder,
    shelfCode,
    photoNumber: Number.isFinite(photoNumber) ? photoNumber : 0,
  };
}

function writeJson(fileName, value) {
  const target = path.join(outputDirectory, fileName);
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
}

function main() {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Arşiv bulunamadı: ${zipPath}`);
  }

  fs.mkdirSync(outputDirectory, { recursive: true });
  const zip = new AdmZip(zipPath);
  const groups = new Map();
  let skippedAssets = 0;

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !IMAGE_EXTENSION.test(entry.entryName)) continue;
    const photo = parsePhoto(entry.entryName);
    if (NON_PRODUCT_FOLDERS.has(photo.sourceFolder)) {
      skippedAssets += 1;
      continue;
    }

    // A shelf code is normally global, but retaining its folder avoids an
    // accidental merge if the archive contains a repeated stock code.
    const groupKey = `${photo.sourceFolder}\u0000${photo.shelfCode}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: crypto.createHash("sha1").update(groupKey).digest("hex").slice(0, 12),
        shelfCode: photo.shelfCode,
        sourceFolder: photo.sourceFolder,
        sourceBrandFolder: photo.sourceBrandFolder,
        sourceKey: groupKey,
        status: "pending_ocr",
        images: [],
      });
    }
    groups.get(groupKey).images.push(photo);
  }

  const products = [...groups.values()]
    .map((product) => ({
      ...product,
      imageCount: product.images.length,
      images: product.images.sort(
        (a, b) => a.photoNumber - b.photoNumber || a.archivePath.localeCompare(b.archivePath)
      ),
    }))
    .sort((a, b) =>
      a.sourceFolder.localeCompare(b.sourceFolder, "tr") || a.shelfCode.localeCompare(b.shelfCode, "tr")
    );

  const normalizedRequestedFolder = normalize(requestedFolder);
  const eligible = normalizedRequestedFolder
    ? products.filter((product) => normalize(product.sourceFolder) === normalizedRequestedFolder)
    : products;
  const pilot = eligible.slice(0, pilotSize);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceZip: zipPath,
    semantics: {
      shelfCode: "Arşiv dosya adındaki fotoğraf sıra eki öncesindeki stok/raf kodu.",
      oemNumber: "OCR veya insan incelemesi ile ayrıca doğrulanacak parça numarası.",
    },
    counts: {
      products: products.length,
      images: products.reduce((total, product) => total + product.imageCount, 0),
      skippedAssets,
    },
    products,
  };

  writeJson("manifest.json", manifest);
  writeJson("pilot.json", {
    ...manifest,
    products: pilot,
    pilot: {
      requestedFolder: requestedFolder || null,
      size: pilot.length,
    },
  });

  const csv = [
    ["id", "raf_kodu", "kaynak_klasor", "marka_klasoru", "gorsel_sayisi", "durum", "ilk_arsiv_yolu"],
    ...products.map((product) => [
      product.id,
      product.shelfCode,
      product.sourceFolder,
      product.sourceBrandFolder,
      product.imageCount,
      product.status,
      product.images[0]?.archivePath || "",
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  fs.writeFileSync(path.join(outputDirectory, "manifest.csv"), `\uFEFF${csv}\n`, "utf8");

  if (extractPilot) {
    const pilotDirectory = path.join(outputDirectory, "pilot-images");
    fs.mkdirSync(pilotDirectory, { recursive: true });
    const entriesByPath = new Map(zip.getEntries().map((entry) => [entry.entryName, entry]));
    for (const product of pilot) {
      const productDirectory = path.join(pilotDirectory, `${product.id}__${product.shelfCode.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
      fs.mkdirSync(productDirectory, { recursive: true });
      for (const image of product.images) {
        const entry = entriesByPath.get(image.archivePath);
        if (entry) fs.writeFileSync(path.join(productDirectory, path.basename(image.archivePath)), entry.getData());
      }
    }
  }

  const instructions = [
    "# data.zip güvenli OCR pilotu",
    "",
    `- Kaynak arşiv: ${zipPath}`,
    `- Ürün grubu: ${products.length}`,
    `- Görsel: ${manifest.counts.images}`,
    `- Pilot: ${pilot.length} ürün${requestedFolder ? ` (${requestedFolder})` : ""}`,
    "- Raf kodu ürünün stok kimliğidir; OEM sonucu ile değiştirilmez.",
    "- Bu hazırlık adımı kaynak ZIP'i, ürün veritabanını ve mevcut görselleri değiştirmez.",
    "",
    "Yerel çoklu-fotoğraf OCR raporu için:",
    "node scripts/run_pilot_ocr_consensus.js --input .tms-import/pilot.json",
  ].join("\n");
  fs.writeFileSync(path.join(outputDirectory, "README.md"), `${instructions}\n`, "utf8");

  console.log(`Manifest hazır: ${path.join(outputDirectory, "manifest.json")}`);
  console.log(`Ürün grubu: ${products.length} | Görsel: ${manifest.counts.images} | Atlanan varlık: ${skippedAssets}`);
  console.log(`Pilot hazır: ${pilot.length} ürün${requestedFolder ? ` | Klasör: ${requestedFolder}` : ""}`);
  if (extractPilot) console.log(`Pilot görselleri çıkarıldı: ${path.join(outputDirectory, "pilot-images")}`);
}

main();
