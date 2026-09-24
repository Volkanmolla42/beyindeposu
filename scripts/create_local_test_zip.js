/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Creates a small, self-contained product archive for the local importer.
 * It preserves the original data.zip entry paths so the normal manifest-based
 * pipeline can be tested without touching the source archive.
 */

const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function atomicWrite(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

const manifestPath = readOption("--manifest", path.join(process.cwd(), ".tms-import", "manifest.json"));
const count = Number.parseInt(readOption("--count", "5"), 10);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sourceZipPath = readOption("--zip", manifest.sourceZip);
const outputZipPath = readOption("--out", path.join(path.dirname(manifestPath), `gpt-luna-test-${count}-products.zip`));
const outputManifestPath = readOption("--out-manifest", path.join(path.dirname(manifestPath), `gpt-luna-test-${count}-manifest.json`));

if (!Number.isInteger(count) || count < 1) throw new Error("--count pozitif bir tam sayı olmalıdır.");
if (!fs.existsSync(sourceZipPath)) throw new Error(`Kaynak ZIP bulunamadı: ${sourceZipPath}`);
if (!manifest.products.length) throw new Error("Manifest içinde ürün bulunamadı.");

const sourceZip = new AdmZip(sourceZipPath);
const entries = new Map(sourceZip.getEntries().map((entry) => [entry.entryName, entry]));
const selected = [];
const usedIds = new Set();

for (let index = 0; index < Math.min(count, manifest.products.length); index += 1) {
  const sourceIndex = manifest.products.length === 1
    ? 0
    : Math.round((index * (manifest.products.length - 1)) / (Math.min(count, manifest.products.length) - 1));
  const product = manifest.products[sourceIndex];
  if (product && !usedIds.has(product.id)) {
    selected.push(product);
    usedIds.add(product.id);
  }
}

const outputZip = new AdmZip();
let imageCount = 0;
for (const product of selected) {
  for (const image of product.images) {
    const entry = entries.get(image.archivePath);
    if (!entry) continue;
    outputZip.addFile(image.archivePath, entry.getData());
    imageCount += 1;
  }
}

fs.mkdirSync(path.dirname(outputZipPath), { recursive: true });
if (fs.existsSync(outputZipPath)) fs.unlinkSync(outputZipPath);
outputZip.writeZip(outputZipPath);

const testManifest = {
  ...manifest,
  generatedAt: new Date().toISOString(),
  sourceZip: outputZipPath,
  counts: {
    products: selected.length,
    images: imageCount,
    skippedAssets: 0,
  },
  products: selected,
  test: {
    sourceManifest: manifestPath,
    selectedBy: "evenly spaced catalog samples",
    requestedProducts: count,
  },
};
atomicWrite(outputManifestPath, testManifest);

console.log(`Test ZIP hazır: ${outputZipPath}`);
console.log(`Test manifest hazır: ${outputManifestPath}`);
console.log(`Ürün: ${selected.length} | Görsel: ${imageCount}`);
console.log(`Raf kodları: ${selected.map((product) => product.shelfCode).join(", ")}`);
