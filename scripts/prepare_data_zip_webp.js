/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Non-destructive bulk WebP preparation for the local product importer.
 *
 * The source archive is never modified. Product images are written to a
 * separate, re-runnable directory while preserving their archive paths so
 * the importer can map each prepared image back to its product.
 */
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;
const NON_PRODUCT_FOLDERS = new Set(["site", "manifacturer", "oxyn", "data", "__MACOSX"]);
const DEFAULT_ZIP = "C:\\Users\\volkan\\Desktop\\data.zip";
const DEFAULT_OUTPUT = path.join(process.cwd(), ".tms-import", "normalized-images");

function hasFlag(name) {
  return process.argv.includes(name);
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function atomicWrite(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function sourceFolderFor(entryName) {
  const segments = entryName.split("/").filter(Boolean);
  return segments[1] || "Bilinmeyen";
}

function preparedPathFor(outputDirectory, archivePath) {
  const segments = archivePath.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Güvenli olmayan arşiv yolu: ${archivePath}`);
  }

  const fileName = segments.at(-1);
  const extension = path.extname(fileName);
  const webpName = `${fileName.slice(0, fileName.length - extension.length)}.webp`;
  return path.join(outputDirectory, ...segments.slice(0, -1), webpName);
}

async function isValidWebp(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const metadata = await sharp(filePath).metadata();
    return metadata.format === "webp" && Number(metadata.width) > 0 && Number(metadata.height) > 0;
  } catch {
    return false;
  }
}

async function convertEntry(entry, outputDirectory, options, index) {
  const outputPath = preparedPathFor(outputDirectory, entry.entryName);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (!options.force && await isValidWebp(outputPath)) {
    return { status: "reused", outputPath };
  }

  const temporaryPath = `${outputPath}.tmp-${process.pid}-${index}`;
  try {
    await sharp(entry.getData(), { failOn: "none" })
      .rotate()
      .resize({
        width: options.maxDimension,
        height: options.maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: options.quality, effort: 4 })
      .toFile(temporaryPath);

    if (fs.existsSync(outputPath)) fs.rmSync(outputPath);
    fs.renameSync(temporaryPath, outputPath);
    return { status: "converted", outputPath };
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
  }
}

async function main() {
  const zipPath = path.resolve(readOption("--zip", process.env.TMS_DATA_ZIP || DEFAULT_ZIP));
  const outputDirectory = path.resolve(readOption("--out", DEFAULT_OUTPUT));
  const maxDimension = Number.parseInt(readOption("--max-dimension", "1600"), 10);
  const quality = Number.parseInt(readOption("--webp-quality", "82"), 10);
  const concurrency = Number.parseInt(readOption("--concurrency", "4"), 10);
  const force = hasFlag("--force");

  if (!fs.existsSync(zipPath)) throw new Error(`Arşiv bulunamadı: ${zipPath}`);
  if (!Number.isInteger(maxDimension) || maxDimension < 256) throw new Error("--max-dimension en az 256 olmalıdır.");
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) throw new Error("--webp-quality 1-100 arasında olmalıdır.");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("--concurrency 1-8 arasında olmalıdır.");

  fs.mkdirSync(outputDirectory, { recursive: true });
  const zip = new AdmZip(zipPath);
  const imageEntries = zip.getEntries().filter((entry) => !entry.isDirectory && IMAGE_EXTENSION.test(entry.entryName));
  const productEntries = imageEntries.filter((entry) => !NON_PRODUCT_FOLDERS.has(sourceFolderFor(entry.entryName)));
  const excludedEntries = imageEntries.filter((entry) => NON_PRODUCT_FOLDERS.has(sourceFolderFor(entry.entryName)));
  const records = productEntries.map((entry) => ({
    archivePath: entry.entryName,
    sourceFolder: sourceFolderFor(entry.entryName),
    outputPath: preparedPathFor(outputDirectory, entry.entryName),
  }));

  console.log(`Toplu WebP hazırlığı | kaynak görsel: ${productEntries.length} | atlanan varlık: ${excludedEntries.length}`);
  console.log(`Kaynak: ${zipPath}`);
  console.log(`Çıktı: ${outputDirectory}`);
  console.log(`Ayarlar: max=${maxDimension}px | kalite=${quality} | paralellik=${concurrency}`);

  let nextIndex = 0;
  let completed = 0;
  let converted = 0;
  let reused = 0;
  const failures = [];
  const options = { maxDimension, quality, force };

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= productEntries.length) return;
      const entry = productEntries[index];
      try {
        const result = await convertEntry(entry, outputDirectory, options, index);
        if (result.status === "converted") converted += 1;
        if (result.status === "reused") reused += 1;
      } catch (error) {
        failures.push({ archivePath: entry.entryName, error: error.message || String(error) });
      }
      completed += 1;
      if (completed % 100 === 0 || completed === productEntries.length) {
        process.stdout.write(`\rİlerleme: ${completed}/${productEntries.length} | yeni: ${converted} | mevcut: ${reused} | hata: ${failures.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, productEntries.length) }, () => worker()));
  process.stdout.write("\n");

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceZip: zipPath,
    outputDirectory,
    settings: { maxDimension, quality, concurrency },
    counts: {
      sourceImages: imageEntries.length,
      productImages: productEntries.length,
      skippedAssets: excludedEntries.length,
      converted,
      reused,
      failed: failures.length,
    },
    skippedAssetPaths: excludedEntries.map((entry) => entry.entryName),
    failures,
    images: records,
  };
  atomicWrite(path.join(outputDirectory, "manifest.json"), report);

  console.log(`Tamamlandı | WebP yeni: ${converted} | mevcut: ${reused} | hata: ${failures.length}`);
  console.log(`Manifest: ${path.join(outputDirectory, "manifest.json")}`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
