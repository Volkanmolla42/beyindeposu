/*
 * Read-only reconciliation between data.zip images and the Convex catalog.
 *
 * A stored shelfCode can be malformed by an older importer. The reliable
 * source of truth is the byte-for-byte image match: each catalog image is
 * SHA-256 matched to its original image in data.zip.
 *
 * Usage:
 *   node scripts/reconcile_zip_shelf_codes.js
 *   node scripts/reconcile_zip_shelf_codes.js --zip "D:\\data.zip" --out ".tms-import"
 */

const AdmZip = require("adm-zip");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;
const NON_PRODUCT_FOLDERS = new Set(["site", "manifacturer", "oxyn", "data", "__MACOSX"]);

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function loadEnvironmentFile(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function imageHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function shelfCodeFromArchivePath(entryName) {
  const parts = entryName.split("/").filter(Boolean);
  const fileName = parts.at(-1);
  const stem = path.basename(fileName, path.extname(fileName)).replace(/_resized$/i, "");
  return (stem.match(/^(.*)\.\d+$/)?.[1] || stem).trim();
}

function safeLocalImagePath(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("/uploads/products/")) return null;
  const root = path.resolve(process.cwd(), "public", "uploads", "products");
  const target = path.resolve(process.cwd(), "public", imageUrl.slice(1));
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const zipPath = readOption("--zip", process.env.TMS_DATA_ZIP || "C:\\Users\\volkan\\Desktop\\data.zip");
const outputDirectory = readOption("--out", path.join(process.cwd(), ".tms-import"));

async function fetchAllProducts(client) {
  const firstPage = await client.query(api.products.getProductsPage, {
    page: 1,
    pageSize: 200,
    includeReview: true,
  });
  const products = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const response = await client.query(api.products.getProductsPage, {
      page,
      pageSize: 200,
      includeReview: true,
    });
    products.push(...response.items);
    process.stdout.write(`\rConvex kayıtları alınıyor: ${products.length}/${firstPage.totalItems}`);
  }
  process.stdout.write("\n");
  return products;
}

async function main() {
  if (!fs.existsSync(zipPath)) throw new Error(`Arşiv bulunamadı: ${zipPath}`);
  loadEnvironmentFile(path.join(process.cwd(), ".env.local"));
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL tanımlı değil.");
  fs.mkdirSync(outputDirectory, { recursive: true });

  console.log("ZIP görsel özetleri hazırlanıyor...");
  const zip = new AdmZip(zipPath);
  const hashToSource = new Map();
  const zipShelves = new Set();
  let zipImageCount = 0;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !IMAGE_EXTENSION.test(entry.entryName)) continue;
    const folder = entry.entryName.split("/").filter(Boolean)[1];
    if (NON_PRODUCT_FOLDERS.has(folder)) continue;
    const shelfCode = shelfCodeFromArchivePath(entry.entryName);
    zipShelves.add(shelfCode);
    const hash = imageHash(entry.getData());
    const sources = hashToSource.get(hash) || [];
    sources.push({ shelfCode, archivePath: entry.entryName });
    hashToSource.set(hash, sources);
    zipImageCount += 1;
  }

  const products = await fetchAllProducts(new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL));
  const records = products.map((product) => {
    const matches = [];
    const missingLocalFiles = [];
    for (const imageUrl of product.images || []) {
      const localPath = safeLocalImagePath(imageUrl);
      if (!localPath || !fs.existsSync(localPath)) {
        missingLocalFiles.push(imageUrl);
        continue;
      }
      const source = hashToSource.get(imageHash(fs.readFileSync(localPath))) || [];
      matches.push(...source);
    }
    const recoveredShelves = [...new Set(matches.map((match) => match.shelfCode))];
    const storedShelfInZip = Boolean(product.shelfCode && zipShelves.has(product.shelfCode));
    const status = recoveredShelves.length === 1
      ? recoveredShelves[0] === product.shelfCode ? "stored_code_confirmed" : "recovered_from_image"
      : recoveredShelves.length > 1 ? "multiple_source_shelves" : storedShelfInZip ? "stored_code_unverified" : "no_zip_image_match";
    return {
      productId: product._id,
      storedShelfCode: product.shelfCode || null,
      recoveredShelfCode: recoveredShelves.length === 1 ? recoveredShelves[0] : null,
      status,
      matchedArchivePaths: [...new Set(matches.map((match) => match.archivePath))],
      missingLocalFiles,
      title: product.title,
      oemNumber: product.oemNumber,
    };
  });

  const countByStatus = Object.fromEntries(
    [...new Set(records.map((record) => record.status))].sort().map((status) => [
      status,
      records.filter((record) => record.status === status).length,
    ])
  );
  const summary = {
    generatedAt: new Date().toISOString(),
    zip: { productShelves: zipShelves.size, images: zipImageCount },
    convexProducts: products.length,
    countByStatus,
    recoveredCorrections: records.filter((record) => record.status === "recovered_from_image").length,
    records,
  };
  fs.writeFileSync(path.join(outputDirectory, "shelf-reconciliation.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const csv = [
    ["durum", "kayitli_raf_kodu", "geri_kazanilan_raf_kodu", "oem", "baslik", "kaynak_zip_gorselleri"],
    ...records
      .filter((record) => record.status !== "stored_code_confirmed")
      .map((record) => [
        record.status,
        record.storedShelfCode || "",
        record.recoveredShelfCode || "",
        record.oemNumber,
        record.title,
        record.matchedArchivePaths.join(" | "),
      ]),
  ].map((row) => row.map(csvCell).join(",")).join("\n");
  fs.writeFileSync(path.join(outputDirectory, "shelf-reconciliation.csv"), `\uFEFF${csv}\n`, "utf8");
  console.log(JSON.stringify({ countByStatus, recoveredCorrections: summary.recoveredCorrections }, null, 2));
  console.log(`Rapor: ${path.join(outputDirectory, "shelf-reconciliation.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
