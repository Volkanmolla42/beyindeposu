/*
 * Reads every available angle for a pilot product and produces candidates only.
 * It never renames images, writes into public/, or calls Convex.
 *
 * Usage:
 *   node scripts/run_pilot_ocr_consensus.js --input .tms-import/pilot.json
 *   node scripts/run_pilot_ocr_consensus.js --input .tms-import/pilot.json --max-images 4
 */

const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

const inputPath = readOption("--input", path.join(process.cwd(), ".tms-import", "pilot.json"));
const maxImages = Number.parseInt(readOption("--max-images", "4"), 10);

if (!Number.isInteger(maxImages) || maxImages < 1) {
  throw new Error("--max-images pozitif bir tam sayı olmalıdır.");
}

const OEM_PATTERNS = [
  { name: "Bosch", regex: /\b0\s*2(?:61|80)\s*\d{3}\s*\d{3}\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  { name: "Mercedes-Benz", regex: /\bA\s*\d{3}\s*\d{3}\s*\d{2}\s*\d{2}\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  // VAG part numbers look like 1K0 907 379 or 038 906 018. Requiring the
  // numeric structure avoids treating arbitrary OCR gibberish as a VAG code.
  { name: "VAG", regex: /\b(?:\d[A-Z0-9]\d|\d{3})\s*\d{3}\s*\d{3}\s*[A-Z]{0,3}\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  { name: "Renault / Nissan", regex: /\b(?:8200\s*\d{6}|23710\s*[0-9A-Z]{5,7}|S1\d[0-9A-Z]{7,9})\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  { name: "Ford", regex: /\b[0-9A-Z]{4}\s*1[0-9A-Z]{5,7}\s*[A-Z]{1,3}\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  { name: "PSA", regex: /\b96\s*\d{6,8}\s*80\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  { name: "Siemens / Continental", regex: /\b(?:5WK[0-9A-Z]{4,7}|S1[0-9A-Z]{7,9})\b/i, normalize: (value) => value.replace(/\s+/g, "") },
  { name: "Marelli", regex: /\bIAW\s*[0-9A-Z.-]{4,}\b/i, normalize: (value) => value.replace(/\s+/g, "") },
];

function candidatesFromText(text) {
  const candidates = [];
  for (const pattern of OEM_PATTERNS) {
    const matches = text.match(new RegExp(pattern.regex.source, `${pattern.regex.flags}g`)) || [];
    for (const match of matches) {
      const value = pattern.normalize(match).toUpperCase();
      if (value.length >= 6) candidates.push({ value, pattern: pattern.name });
    }
  }
  return candidates;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function main() {
  if (!fs.existsSync(inputPath)) throw new Error(`Pilot bulunamadı: ${inputPath}`);
  const pilot = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const outputDirectory = path.dirname(inputPath);
  const zip = new AdmZip(pilot.sourceZip);
  const entriesByPath = new Map(zip.getEntries().map((entry) => [entry.entryName, entry]));
  const results = [];
  // Reuse the worker for the entire pilot. Creating one worker per image is
  // both much slower and much more memory intensive.
  const worker = await Tesseract.createWorker("eng", 1, { logger: () => {} });

  try {
    for (let productIndex = 0; productIndex < pilot.products.length; productIndex += 1) {
      const product = pilot.products[productIndex];
      const evidence = new Map();
      const inspectedImages = product.images.slice(0, maxImages);

      for (const image of inspectedImages) {
        const entry = entriesByPath.get(image.archivePath);
        if (!entry) continue;
        const recognition = await worker.recognize(entry.getData());
        const rawText = recognition.data.text || "";
        for (const candidate of candidatesFromText(rawText)) {
          const current = evidence.get(candidate.value) || { value: candidate.value, patterns: new Set(), imagePaths: [] };
          current.patterns.add(candidate.pattern);
          current.imagePaths.push(image.archivePath);
          evidence.set(candidate.value, current);
        }
      }

      const rankedCandidates = [...evidence.values()]
        .map((candidate) => ({
          value: candidate.value,
          patterns: [...candidate.patterns],
          imagePaths: [...new Set(candidate.imagePaths)],
          hits: candidate.imagePaths.length,
        }))
        .sort((a, b) => b.hits - a.hits || a.value.localeCompare(b.value));
      const best = rankedCandidates[0] || null;
      const status = best && best.hits >= 2 ? "consensus_candidate" : best ? "single_photo_candidate" : "needs_review";

      results.push({
        id: product.id,
        shelfCode: product.shelfCode,
        sourceFolder: product.sourceFolder,
        imageCount: product.imageCount,
        inspectedImageCount: inspectedImages.length,
        status,
        recommendedOem: best?.value || null,
        candidates: rankedCandidates,
      });
      console.log(`[${productIndex + 1}/${pilot.products.length}] ${product.shelfCode}: ${status}${best ? ` (${best.value})` : ""}`);
    }
  } finally {
    await worker.terminate();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    sourcePilot: inputPath,
    policy: "Bir OCR sonucu OEM olarak otomatik kabul edilmez. consensus_candidate kayıtları bile görsel model veya insan incelemesi ile doğrulanmalıdır.",
    counts: {
      products: results.length,
      consensusCandidate: results.filter((result) => result.status === "consensus_candidate").length,
      singlePhotoCandidate: results.filter((result) => result.status === "single_photo_candidate").length,
      needsReview: results.filter((result) => result.status === "needs_review").length,
    },
    results,
  };
  fs.writeFileSync(path.join(outputDirectory, "ocr-pilot-results.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const csv = [
    ["raf_kodu", "kaynak_klasor", "durum", "onerilen_oem", "adaylar"],
    ...results.map((result) => [
      result.shelfCode,
      result.sourceFolder,
      result.status,
      result.recommendedOem || "",
      result.candidates.map((candidate) => `${candidate.value} (${candidate.hits})`).join(" | "),
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  fs.writeFileSync(path.join(outputDirectory, "ocr-pilot-results.csv"), `\uFEFF${csv}\n`, "utf8");
  console.log(JSON.stringify(summary.counts));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
