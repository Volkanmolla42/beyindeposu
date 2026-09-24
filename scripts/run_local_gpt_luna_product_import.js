/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Local Upload product matcher.
 *
 * Pipeline:
 *   data.zip -> GLM 5.3 Flash vision OCR -> AI Gateway Exa search
 *   -> GLM 5.3 Flash enrichment -> optional Convex batch insert
 *
 * Safe defaults:
 * - no paid model calls without --run
 * - Convex writes are enabled by default; use --no-write to skip persistence
 * - no product reset without --reset (and write enabled)
 * - shelfCode remains the archive/stok identity and is never used as OEM
 *
 * Examples:
 *   node scripts/run_local_gpt_luna_product_import.js --limit 10
 *   node scripts/run_local_gpt_luna_product_import.js --run --limit 10 --budget-usd 2
 *   node scripts/run_local_gpt_luna_product_import.js --run --budget-usd 20
 *   node scripts/run_local_gpt_luna_product_import.js --run --no-write --budget-usd 1
 *   node scripts/run_local_gpt_luna_product_import.js --run --reset --budget-usd 20
 */

const AdmZip = require("adm-zip");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { generateText, gateway, stepCountIs, Output } = require("ai");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

const DEFAULT_MODEL = "zai/glm-5.3-flash";
const DEFAULT_PROVIDER = "zai";
const IMPORT_PIPELINE_VERSION = 5;
const DEFAULT_DB_BATCH_SIZE = 25;
const DEFAULT_GATEWAY_REQUEST_TIMEOUT_MS = 120000;
const ZAI_DISCOUNT_MULTIPLIER = 0.5;
const ZAI_LOW_REASONING_OPTIONS = {
  zai: {
    thinking: { type: "enabled" },
    reasoningEffort: "low",
  },
};
const MODEL_PRICING_PER_MILLION = {
  [DEFAULT_MODEL]: { input: 0.15, output: 0.5 },
};
const DEFAULT_ZIP = "C:\\Users\\volkan\\Desktop\\data.zip";
const DEFAULT_MANIFEST = path.join(process.cwd(), ".tms-import", "manifest.json");
const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), ".tms-import");
const DEFAULT_NORMALIZED_IMAGE_DIR = path.join(DEFAULT_OUTPUT_DIR, "normalized-images");

const UI_DESCRIPTION_FORMAT_PROMPT = `
AÇIKLAMA (description) ALANI FORMATI — ZORUNLU:
description alanını aşağıdaki başlıkları ve sırayı koruyarak Markdown metni olarak doldur. Köşeli parantez içindeki açıklamaları gerçek ve kaynaklarla desteklenen bilgilerle değiştir; köşeli parantezleri çıktıda bırakma. Bir bilgi kaynaklarda veya görselde yoksa "Belirtilmemiş / doğrulanamadı" yaz; kesin olmayan uyumluluk, motor, model yılı, garanti, test sonucu veya teknik özellik uydurma.

[OEM_KODU veya İNCELEME GEREKLİ] [Marka] [Parça Türü]
[OEM_KODU veya İNCELEME GEREKLİ], [Marka] araçlarda kullanılan orijinal [Parça Türü] parçasıdır. [Parçanın araç üzerindeki konumu, temel görevi ve yönettiği sistemler hakkında 2-3 cümlelik net teknik açıklama].

Ürün Bilgileri
Ürün: [Parça Türü / Modül Adı]
Marka: [Araç Markası]
Model: [Kaynaklarla desteklenen uyumlu araç modelleri ve kasa tipleri]
Parça Kodu: [Net görsel OEM kodu; net değilse İNCELEME GEREKLİ]
OEM Referansı: [Yalnızca doğrulanmış referans; doğrulanmadıysa Belirtilmemiş / doğrulanamadı]
Alternatif Referans: [Kaynaklarda açıkça eşleşen ikincil / Bosch / üretici kodu veya Belirtilmemiş / doğrulanamadı]
Parça Tipi: [Elektronik Kontrol Ünitesi / Cam Motoru / Gövde Modülü / vb.]
Sistem: [Yönetilen sistem adı, örn. Elektrikli Cam ve Kapı Sistemi / Gövde Elektroniği / Motor Yönetim Sistemi / ABS Fren]

Referans Kodları
[Net OEM kodu veya İNCELEME GEREKLİ]
[Varsa kaynaklarda geçen alternatif üretici kodları]
[Kodların kataloglardaki kullanımını ve çapraz referans durumunu açıklayan kısa not]

Uyumlu Araçlar
Marka | Model | Motor | Model Yılı
[Yalnızca kaynaklarla desteklenen araç satırları; destek yoksa Belirtilmemiş / doğrulanamadı]

[Uyumlu araçlar, motor kodları ve soket/donanım versiyonu kontrolü hakkında 1-2 cümlelik teyit notu]

Ürün Açıklaması
[Parçanın doğrulanmış teknik çalışma prensibi, montaj konumu ve elektrik/sinyal bağlantıları].
[Bu parçada görülebilecek olası arıza belirtileri; yalnızca parça türüyle genel olarak destekleniyorsa yaz].
[Montaj, çıkma parça testi, soket bağlantıları ve uzman servis montajı tavsiyesi].

Uyumluluk Uyarısı
[Parça referans numarasının mevcut parça üzerindeki etiketle birebir karşılaştırılması gerektiğini belirt. Donanım, soket ve yön (sağ/sol) farklarını uyarı olarak ekle].
Sipariş öncesinde mevcut parçanızın üzerindeki parça numarasını, soketlerini, pin yapısını ve mümkünse araç şase (VIN) numarasını mutlaka karşılaştırınız.

Yerel içe aktarma OEM kuralı: Görselde kod net okunuyorsa onu kullan; kod kısmi/silikse oemNumber alanına web adayını yazma. Webden bulunan muhtemel kodları yalnızca probableOemCodes/reviewCodes alanlarında aday olarak tut ve açıklamada kesin OEM gibi sunma.`;

function hasFlag(name) {
  return process.argv.includes(name);
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

function getGatewayProvider() {
  return process.env.TMS_AI_PROVIDER || DEFAULT_PROVIDER;
}

function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function atomicWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function parseJsonObject(value) {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct;
  } catch {
    // Continue with a balanced-object extraction for reasoning prefixes and suffixes.
  }
  for (let start = 0; start < cleaned.length; start += 1) {
    if (cleaned[start] !== "{") continue;
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          const candidate = cleaned.slice(start, index + 1)
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/,\s*([}\]])/g, "$1");
          try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
          } catch {
            try {
              // json5 is already part of the project's dependency tree and handles
              // single-quoted keys/values that some reasoning models emit.
              const parsed = require("json5").parse(candidate);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
            } catch {
              // Try the next balanced object in case the model included an invalid example first.
            }
          }
          break;
        }
      }
    }
  }
  return null;
}

function nullableString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(null|none|unknown|n\/a|yok|okunamadı)$/i.test(trimmed)) return null;
  return trimmed;
}

function normaliseCode(value) {
  const stringValue = nullableString(value);
  return stringValue ? stringValue.toUpperCase().replace(/\s+/g, " ").trim() : null;
}

function compactCode(value) {
  return normaliseCode(value)?.replace(/[^A-Z0-9]/g, "") || "";
}

function isPlausibleOem(value) {
  const normalised = normaliseCode(value);
  const compact = compactCode(normalised);
  if (!normalised || compact.length < 6 || compact.length > 24) return false;
  if (!/^[A-Z0-9 ._\-/]+$/.test(normalised)) return false;
  if (!/\d/.test(compact)) return false;
  if (/^(UNKNOWN|NONE|NULL|NOREAD|OKUNAMADI|INCELEMEGEREKLI)$/.test(compact)) return false;
  return true;
}

function slugify(value) {
  return String(value || "genel")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-") || "genel";
}

function detectBrand(folderString) {
  const value = (folderString || "").toLocaleLowerCase("tr-TR");
  if (value.includes("mercedes")) return "Mercedes-Benz";
  if (value.includes("bmw")) return "BMW";
  if (value.includes("audi")) return "Audi";
  if (value.includes("vw") || value.includes("volkswagen")) return "Volkswagen";
  if (value.includes("skoda")) return "Skoda";
  if (value.includes("seat")) return "Seat";
  if (value.includes("renault")) return "Renault";
  if (value.includes("fiat")) return "Fiat";
  if (value.includes("opel")) return "Opel";
  if (value.includes("peugeot")) return "Peugeot";
  if (value.includes("citroen") || value.includes("citroën")) return "Citroën";
  if (value.includes("ford")) return "Ford";
  if (value.includes("hyundai")) return "Hyundai";
  if (value.includes("kia")) return "Kia";
  if (value.includes("toyota")) return "Toyota";
  if (value.includes("honda")) return "Honda";
  if (value.includes("nissan")) return "Nissan";
  if (value.includes("volvo")) return "Volvo";
  if (value.includes("mitsubishi")) return "Mitsubishi";
  if (value.includes("mazda")) return "Mazda";
  if (value.includes("suzuki")) return "Suzuki";
  if (value.includes("chevrolet")) return "Chevrolet";
  return "Genel Uyumlu";
}

function detectCategorySlug(folderString) {
  const value = (folderString || "").toLocaleLowerCase("tr-TR");
  if (value.includes("ecu setler")) return "ecu-motor-beyin-setleri";
  if (value.includes("/ecu/") || value.includes("data/ecu") || value.includes("ecu")) return "motor-beyinleri-ecu";
  if (value.includes("/abs/") || value.includes("data/abs") || value.includes("abs")) return "abs-esp-beyinleri";
  if (value.includes("km saatleri") || value.includes("gosterge") || value.includes("gösterge")) return "gosterge-panelleri";
  if (value.includes("sigorta")) return "sigorta-kutulari";
  if (value.includes("kumanda") || value.includes("panel ve du") || value.includes("düğme")) return "kumanda-panel-ve-dugmeler";
  if (value.includes("modül") || value.includes("modul")) return "bcm-bsi-sam-modulleri";
  if (value.includes("airbag")) return "airbag-beyinleri";
  if (value.includes("kollar")) return "direksiyon-kumanda-modulleri";
  if (value.includes("kontak") || value.includes("calistirma") || value.includes("çalıştırma")) return "konfor-modulleri";
  if (value.includes("multimedya")) return "multimedya-uniteleri";
  if (value.includes("cam motor")) return "cam-kapi-motorlari";
  if (value.includes("direksiyon")) return "direksiyon-pompa";
  return "oto-elektronik-genel";
}

function gatewayUsageCost(usage, model, provider = getGatewayProvider()) {
  const modelId = String(model || DEFAULT_MODEL);
  const pricing = MODEL_PRICING_PER_MILLION[modelId];
  if (!pricing) throw new Error(`AI Gateway modeli için fiyat tanımı yok: ${modelId}`);
  if (provider !== DEFAULT_PROVIDER) throw new Error(`Bu importer yalnızca ${DEFAULT_PROVIDER} provider'ını destekliyor: ${provider}`);
  const inputTokens = Number(usage?.inputTokens ?? usage?.promptTokens ?? 0);
  const outputTokens = Number(usage?.outputTokens ?? usage?.completionTokens ?? 0);
  return ((inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000) * ZAI_DISCOUNT_MULTIPLIER;
}

async function requestGatewayJson(request, label, timeoutMs = DEFAULT_GATEWAY_REQUEST_TIMEOUT_MS) {
  const model = request.model || DEFAULT_MODEL;
  const provider = request.provider || getGatewayProvider();
  let lastError = null;
  let lastRawText = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await generateText({
        model: gateway(model),
        system: request.system,
        messages: [{ role: "user", content: request.contentBuilder ? request.contentBuilder() : request.content }],
        temperature: 0,
        maxOutputTokens: request.maxOutputTokens,
        abortSignal: AbortSignal.timeout(timeoutMs),
        ...(request.structuredOutput ? {
          output: Output.json({
            name: "product_details",
            description: "Return one JSON object containing the requested product fields.",
          }),
        } : {}),
        providerOptions: {
          ...(provider === "zai" ? ZAI_LOW_REASONING_OPTIONS : {}),
          gateway: {
            order: [provider],
            tags: ["tms", "local-product-import", label.split(" ")[0]],
            ...(request.requiresVision ? { has: ["vision"] } : {}),
          },
        },
      });
      const structuredValue = request.structuredOutput ? result.output : null;
      const responseTexts = [
        structuredValue,
        result.text,
        result.reasoningText,
      ].filter((value) => value !== undefined && value !== null && value !== "");
      lastRawText = responseTexts.map((value) => typeof value === "string" ? value : JSON.stringify(value)).join("\n\n");
      const parsed = responseTexts
        .map((value) => value && typeof value === "object" && !Array.isArray(value) ? value : parseJsonObject(String(value || "")))
        .find(Boolean) || null;
      if (!parsed) {
        throw new Error(`${label}: Gateway yanıtından geçerli JSON nesnesi çıkarılamadı. Ham yanıt: ${lastRawText.slice(0, 800)}`);
      }
      const usage = result.totalUsage || result.usage || null;
      return {
        parsed,
        costUsd: gatewayUsageCost(usage, model, provider),
        usage,
      };
    } catch (error) {
      lastError = error;
      if (typeof error?.text === "string") lastRawText = error.text;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  if (lastError && lastRawText && !String(lastError.message || "").includes("Ham yanıt:")) {
    lastError.message = `${lastError.message} Ham yanıt: ${lastRawText.slice(0, 800)}`;
  }
  throw lastError || new Error(`${label}: bilinmeyen AI Gateway hatası`);
}

function normaliseSearchOutput(output, query) {
  const sources = [];
  const results = Array.isArray(output?.results) ? output.results : [];
  for (const result of results) {
    if (!result || typeof result !== "object" || typeof result.url !== "string") continue;
    sources.push({
      url: result.url,
      title: typeof result.title === "string" ? result.title : result.url,
      text: typeof result.text === "string" ? result.text : (typeof result.summary === "string" ? result.summary : ""),
      score: Number.isFinite(Number(result.score)) ? Number(result.score) : undefined,
    });
  }
  return { sources, query };
}

async function searchGatewayForProduct({
  oemCandidates,
  manufacturer,
  brand,
  modelName,
  partType,
  electronicUnitName,
  sourceFolder,
  sourceBrandFolder,
  maxResults,
  requestTimeoutMs = DEFAULT_GATEWAY_REQUEST_TIMEOUT_MS,
  model = DEFAULT_MODEL,
  provider = getGatewayProvider(),
}) {
  const candidates = [...new Set((oemCandidates || []).map(normaliseCode).filter(isPlausibleOem))].slice(0, 3);
  const identityParts = [
    manufacturer,
    brand,
    modelName,
    partType,
    electronicUnitName,
    sourceBrandFolder,
    sourceFolder,
  ]
    .map(nullableString)
    .filter(Boolean);
  const identity = [...new Set(identityParts)].join(" ").trim();
  if (candidates.length === 0 && identityParts.length === 0) {
    return { status: "skipped_no_identity", queries: [], sources: [], costUsd: 0, usage: null };
  }

  const query = candidates.length > 0
    ? `${candidates.map((oem) => `"${oem}"`).join(" OR ")} ${identity || "automotive part"}`.trim()
    : `${identity} OEM part number replacement`.trim();
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await generateText({
        model: gateway(model),
        prompt: candidates.length > 0
          ? `Exa ile şu OEM/parça kodlarını doğrula: ${query}. Ürün katalogları, üretici kaynakları ve güvenilir yedek parça sayfalarına öncelik ver. OEM ile ilgisiz sonuçları kullanma.`
          : `Exa ile görselden tanımlanan şu ürün için web araması yap: ${query}. Ürün katalogları, üretici kaynakları ve güvenilir yedek parça sayfalarına öncelik ver. Ürünü tanımlayan ve OEM/parça numarası içeren sonuçları bul; yalnızca gerçekten ilgili kaynakları döndür.`,
        tools: {
          webSearch: gateway.tools.exaSearch({
            type: "fast",
            numResults: Math.min(Math.max(maxResults || 2, 1), 10),
            contents: {
              text: { maxCharacters: 6000, verbosity: "compact" },
              highlights: { maxCharacters: 1200 },
            },
          }),
        },
        toolChoice: { type: "tool", toolName: "webSearch" },
        stopWhen: stepCountIs(2),
        abortSignal: AbortSignal.timeout(requestTimeoutMs),
        providerOptions: {
          gateway: {
            order: [provider],
            tags: ["tms", "local-product-search", "exa"],
          },
        },
      });

      const rawToolResults = (result.steps || [])
        .flatMap((step) => step.toolResults || [])
        .map((toolResult) => toolResult.output || toolResult.result)
        .filter(Boolean);
      const rawOutput = rawToolResults.find((output) => Array.isArray(output?.results)) || null;
      const parsed = rawOutput ? normaliseSearchOutput(rawOutput, query) : { sources: [], query };
      const sources = parsed.sources.length > 0
        ? parsed.sources
        : (Array.isArray(result.sources) ? result.sources.map((source) => ({ url: source.url, title: source.title || source.url, text: "" })) : []);
      return {
        status: sources.length > 0 || result.text ? "found" : "no_results",
        engine: "exa",
        queries: [query],
        sources: sources.slice(0, maxResults || 2),
        summary: result.text || "",
        costUsd: gatewayUsageCost(result.totalUsage || result.usage, model, provider) + Number(rawOutput?.costDollars?.total || 0),
        usage: result.totalUsage || result.usage || null,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  return { status: "search_error", engine: "exa", queries: [query], sources: [], errors: [lastError?.message || "Exa araması başarısız"], costUsd: 0, usage: null };
}

async function optimiseImage(entry, image, cacheDirectory, maxDimension, webpQuality) {
  const cacheKey = crypto.createHash("sha1")
    .update(`${image.archivePath}:${maxDimension}:${webpQuality}`)
    .digest("hex");
  const filePath = path.join(cacheDirectory, `${cacheKey}.webp`);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(cacheDirectory, { recursive: true });
    await sharp(entry.getData(), { failOn: "none" })
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: webpQuality, effort: 4 })
      .toFile(filePath);
  }
  const metadata = await sharp(filePath).metadata();
  return {
    filePath,
    width: metadata.width || 0,
    height: metadata.height || 0,
    bytes: fs.statSync(filePath).size,
  };
}

function preparedImagePath(normalizedImageDirectory, archivePath) {
  if (!normalizedImageDirectory || typeof archivePath !== "string") return null;
  const segments = archivePath.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) return null;
  const fileName = segments.at(-1);
  const extension = path.extname(fileName);
  const webpName = `${fileName.slice(0, fileName.length - extension.length)}.webp`;
  return path.join(normalizedImageDirectory, ...segments.slice(0, -1), webpName);
}

async function isUsableImageFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const metadata = await sharp(filePath).metadata();
    return Number(metadata.width) > 0 && Number(metadata.height) > 0;
  } catch {
    return false;
  }
}

async function prepareImage(entry, image, cacheDirectory, maxDimension, webpQuality, normalizedImageDirectory) {
  const preparedPath = preparedImagePath(normalizedImageDirectory, image.archivePath);
  if (preparedPath && await isUsableImageFile(preparedPath)) {
    const metadata = await sharp(preparedPath).metadata();
    return {
      filePath: preparedPath,
      width: metadata.width || 0,
      height: metadata.height || 0,
      bytes: fs.statSync(preparedPath).size,
    };
  }
  return optimiseImage(entry, image, cacheDirectory, maxDimension, webpQuality);
}

function makeVisionRequest(images, model, provider = getGatewayProvider()) {
  const content = [{ type: "text", text: "" }];
  content[0].text = `Bu görseller aynı oto elektronik ürününe aittir. Tüm görselleri karşılaştır. Önce ürünün ne olduğunu (marka, model, parça türü) belirle; sonra etiket ve gövde üzerindeki parça kodlarını dikkatle oku. Okunmayan veya silik karakterleri tahmin etme.

OEM OKUMA KURALI:
- oemNumber yalnızca kodun tamamı görselde net ve karakter karakter okunabiliyorsa doldurulabilir.
- Kod kısmi, silik, yansımalı veya birden fazla karakter yoruma açıksa oemNumber null olmalı ve oemReadStatus partial/absent olmalı.
- Kısmen görülen kodu candidateCodes içine yazabilirsin; bu kesin OEM değil, webde araştırılacak adaydır.
- Web araması bu aşamada yapılmıyor; görselde görünmeyen kodu eğitim bilgisinden uydurma.

Yalnızca JSON döndür:
{
  "oemNumber": "görselde net okunan ana OEM kodu veya null",
  "oemReadStatus": "clear | partial | absent",
  "candidateCodes": ["görselde kısmen görülen veya diğer olası kodlar; tahmin edilmiş kod yok"],
  "secondaryCodes": ["Bosch/Siemens/Valeo gibi üretici kodları; yalnızca görselde görülenler"],
  "brand": "araç markası veya null",
  "model": "model veya null",
  "partType": "Türkçe parça türü veya null",
  "manufacturer": "parça üreticisi veya null",
  "electronicUnitName": "teknik İngilizce/Almanca adı veya null",
  "confidence": 0,
  "needsReview": true,
  "reviewReason": "kısa sebep veya null"
}

confidence 0 ile 1 arasında sayı olmalı. Görselde net OEM yoksa ürün kimliğini yine doldur, yalnızca OEM'i null bırak.`;
  for (const image of images) {
    content.push({
      type: "text",
      text: `Görsel ${image.index}: Aşağıdaki ürün görseli`,
    });
    content.push({
      type: "image",
      image: fs.readFileSync(image.filePath),
    });
  }

  return {
    model,
    provider,
    requiresVision: true,
    structuredOutput: true,
    system: "Sen oto elektronik parça etiketleri konusunda dikkatli bir OCR ve ürün tanımlama uzmanısın. Görselde net olmayan OEM'i asla kesin kod gibi yazma; ürün kimliği okunabiliyorsa onu yine bildir.",
    content,
    maxOutputTokens: 1800,
  };
}

function makeSingleFetchRequest(images, model, provider = getGatewayProvider()) {
  const content = [
    {
      type: "text",
      text: `Bu görseller aynı oto elektronik ürününe aittir. Görsellerdeki etiketleri dikkatle oku ve yalnızca görseldeki kanıt ile kendi eğitim bilgini kullan. Web araması yapma ve dış kaynak varmış gibi gösterme. OEM okunamıyorsa tahmin etme, null döndür.

JSON KURALI ÇOK ÖNEMLİ: Yanıtın ilk karakteri { ve son karakteri } olmalı. Yalnızca tek bir geçerli JSON nesnesi döndür; markdown, açıklama, <think> bölümü veya kod bloğu ekleme. Tüm anahtar ve string değerlerde çift tırnak kullan. JSON dışına tek bir kelime bile yazma.
{
  "oemNumber": "görselde okunan ana OEM kodu veya null",
  "candidateCodes": ["görselde görülen diğer olası parça kodları"],
  "secondaryCodes": ["Bosch/Siemens/Valeo gibi üretici kodları"],
  "brand": "araç markası veya null",
  "model": "araç modeli veya null",
  "partType": "Türkçe parça türü veya null",
  "manufacturer": "parça üreticisi veya null",
  "electronicUnitName": "teknik parça adı veya null",
  "title": "Türkçe ürün başlığı veya null",
  "description": "yalnızca görsel ve eğitim bilgisiyle desteklenen temkinli Türkçe açıklama veya null",
  "metaTitle": "SEO başlığı veya null",
  "metaDescription": "kısa SEO açıklaması veya null",
  "metaKeywords": ["anahtar kelimeler"],
  "tags": ["etiketler"],
  "confidence": 0,
  "needsReview": true,
  "reviewReason": "web doğrulaması yapılmadıysa bunu belirten kısa sebep"
}

confidence 0 ile 1 arasında sayı olmalı. Görselden doğrulanamayan uyumluluk, araç modeli, üretici veya teknik özellikleri uydurma.`,
    },
  ];
  content[0].text = `Bu görseller aynı oto elektronik ürününe aittir. Görsellerdeki etiketleri dikkatle oku ve yalnızca görseldeki kanıt ile kendi eğitim bilgini kullan. Web araması yapma ve dış kaynak varmış gibi gösterme. OEM net okunamıyorsa tahmin etme; ürünün kimliğini belirlemeye çalış ve OEM'i null döndür. Kısmi kodları candidateCodes içine al.

${UI_DESCRIPTION_FORMAT_PROMPT}

JSON KURALI ÇOK ÖNEMLİ: Yanıtın ilk karakteri { ve son karakteri } olmalı. Yalnızca tek bir geçerli JSON nesnesi döndür; markdown, açıklama, <think> bölümü veya kod bloğu ekleme. JSON dışına tek bir kelime bile yazma.
{
  "oemNumber": "görselde net okunan ana OEM kodu veya null",
  "oemReadStatus": "clear | partial | absent",
  "candidateCodes": ["görselde görülen kısmi veya diğer olası parça kodları"],
  "secondaryCodes": ["Bosch/Siemens/Valeo gibi üretici kodları"],
  "brand": "araç markası veya null",
  "model": "araç modeli veya null",
  "partType": "Türkçe parça türü veya null",
  "manufacturer": "parça üreticisi veya null",
  "electronicUnitName": "teknik parça adı veya null",
  "title": "Türkçe ürün başlığı veya null",
  "description": "yukarıdaki zorunlu açıklama formatına uygun, yalnızca görsel ve eğitim bilgisiyle desteklenen temkinli Türkçe açıklama veya null",
  "metaTitle": "SEO başlığı veya null",
  "metaDescription": "kısa SEO açıklaması veya null",
  "metaKeywords": ["anahtar kelimeler"],
  "tags": ["etiketler"],
  "confidence": 0,
  "needsReview": true,
  "reviewReason": "web doğrulaması yapılmadıysa bunu belirten kısa sebep"
}

confidence 0 ile 1 arasında sayı olmalı. Görselden doğrulanamayan uyumluluk, araç modeli, üretici veya teknik özellikleri uydurma.`;
  for (const image of images) {
    content.push({
      type: "text",
      text: `Görsel ${image.index}: Aşağıdaki ürün görseli`,
    });
    content.push({
      type: "image",
      image: fs.readFileSync(image.filePath),
    });
  }

  return {
    model,
    provider,
    requiresVision: true,
    structuredOutput: true,
    system: `Sen dikkatli bir oto elektronik ürün katalog uzmanısın. Tek istekte görselleri okuyup JSON üret. Web araması ve dış kaynak kullanma; net olmayan OEM'i null bırak, ancak görselden ürün kimliğini çıkarabiliyorsan bildir.

${UI_DESCRIPTION_FORMAT_PROMPT}`,
    content,
    maxOutputTokens: 3200,
  };
}

function normaliseVisionPayload(parsed) {
  const rawOemNumber = normaliseCode(parsed.oemNumber);
  const declaredStatus = nullableString(parsed.oemReadStatus)?.toLowerCase();
  const oemReadStatus = ["clear", "partial", "absent"].includes(declaredStatus)
    ? declaredStatus
    : rawOemNumber
      ? "partial"
      : "absent";
  const rawCandidateCodes = Array.isArray(parsed.candidateCodes) ? parsed.candidateCodes : [];
  const cleanParsed = { ...parsed };
  delete cleanParsed.readableEvidence;
  return {
    ...cleanParsed,
    oemNumber: oemReadStatus === "clear" && isPlausibleOem(rawOemNumber) ? rawOemNumber : null,
    visibleOemNumber: rawOemNumber,
    oemReadStatus,
    candidateCodes: [...rawCandidateCodes, ...(rawOemNumber && oemReadStatus !== "clear" ? [rawOemNumber] : [])]
      .map(normaliseCode)
      .filter(isPlausibleOem)
      .filter((code, index, values) => values.findIndex((item) => compactCode(item) === compactCode(code)) === index)
      .slice(0, 10),
    secondaryCodes: Array.isArray(parsed.secondaryCodes)
      ? parsed.secondaryCodes.map(normaliseCode).filter(Boolean).slice(0, 10)
      : [],
    confidence: Number(parsed.confidence || 0),
  };
}

function makeEnrichmentRequest(product, vision, search, model, provider = getGatewayProvider()) {
  const makeEnrichmentContent = (evidence, visionSummary) => `Kaynak klasörü: ${product.sourceFolder} / ${product.sourceBrandFolder}
Görsel OCR özeti: ${visionSummary}

Vercel AI Gateway Exa araması ile alınan kaynak metinleri:
${evidence || "Kaynak bulunamadı; ürün kimliği görselden çıkarılabiliyorsa açıklamayı yine doldur, OEM'i kesinleştirme ve needsReview true yap."}

OEM KARAR KURALI:
1. Görselde net okunan ve oemReadStatus=clear olan kodu visibleOemNumber olarak yaz.
2. Görselde net kod yoksa oemNumber kesinlikle null olmalı. Bu durumda ürünün marka/model/parça türünü kullanarak kaynaklarda geçen muhtemel OEM'leri probableOemCodes içine koy.
3. probableOemCodes webden çıkarılmış adaylardır; hiçbirini oemNumber alanına koyma ve doğrulanmış OEM gibi sunma.
4. Her web adayı için kaynak URL'si ve 0-1 arası güven ver. Kaynaklar çelişirse needsReview true yap.
5. Ürün bilgisi ürün kimliğinden güvenle doldurulabilir; OEM bulunamadı diye title/description alanlarını boş bırakma.

${UI_DESCRIPTION_FORMAT_PROMPT}

Şu JSON şemasını doldur:
{
  "visibleOemNumber": "görselde net okunan kod veya null",
  "oemNumber": "yalnızca görselde net okunan ve kaynaklarla çelişmeyen kod; webden çıkarılan adayı buraya yazma",
  "oemSource": "image | web | unresolved",
  "probableOemCodes": [{"code":"...", "confidence":0, "sourceUrls":["..."]}],
  "brand": "araç markası veya null",
  "model": "yalnızca kaynak/görsel destekliyorsa model, yoksa null",
  "partType": "Türkçe parça adı",
  "manufacturer": "üretici veya null",
  "electronicUnitName": "teknik ad",
  "title": "Türkçe ürün başlığı; kesin olmayan OEM'i başlığa koyma",
  "description": "yukarıdaki zorunlu açıklama formatına uygun, kaynaklara dayalı, temkinli Türkçe ürün açıklaması",
  "metaTitle": "SEO başlığı",
  "metaDescription": "kısa SEO açıklaması",
  "metaKeywords": ["anahtar", "kelimeler"],
  "tags": ["etiketler"],
  "confidence": 0,
  "needsReview": true,
  "reviewReason": "kısa sebep veya null"
}`;
  const evidence = (search.sources || [])
    .filter((source) => source && (source.url || source.title || source.text))
    .map((source, index) => `KAYNAK ${index + 1}\nURL: ${source.url || ""}\nBAŞLIK: ${source.title || ""}\nİÇERİK: ${source.text || "(yalnızca başlık/URL mevcut)"}`)
    .join("\n\n")
    .slice(0, 24000);

  const visionSummary = JSON.stringify({
    oemNumber: vision.oemNumber,
    oemReadStatus: vision.oemReadStatus,
    candidateCodes: vision.candidateCodes,
    secondaryCodes: vision.secondaryCodes,
    brand: vision.brand,
    model: vision.model,
    partType: vision.partType,
    manufacturer: vision.manufacturer,
    electronicUnitName: vision.electronicUnitName,
    confidence: vision.confidence,
  });

  return {
    contentBuilder: () => makeEnrichmentContent(evidence, visionSummary),
    model,
    provider,
    structuredOutput: true,
    system: `Sen otomotiv elektronik ürün kataloğu editörüsün. Görsel OCR bulgusu ile web kaynaklarını karşılaştır. Webden bulunan OEM adayını kesin OEM gibi yazma; net görsel kodu ve web adaylarını ayrı alanlarda döndür. Kaynakta olmayan uyumluluk, test, garanti veya araç modelini uydurma. Kaynaklar çelişirse needsReview true yap. Sadece JSON döndür.

${UI_DESCRIPTION_FORMAT_PROMPT}`,
    content: `Kaynak klasörü: ${product.sourceFolder} / ${product.sourceBrandFolder}\nGörsel OCR özeti: ${visionSummary}\n\nVercel AI Gateway Exa araması ile alınan kaynak metinleri:\n${evidence || "Kaynak bulunamadı; yalnızca görsel OCR'a dayan ve needsReview true yap."}\n\nŞu JSON şemasını doldur:\n{\n  "oemNumber": "görsel OCR ile aynı doğrulanmış OEM veya null",\n  "brand": "araç markası veya null",\n  "model": "yalnızca kaynak/görsel destekliyorsa model, yoksa null",\n  "partType": "Türkçe parça adı",\n  "manufacturer": "üretici veya null",\n  "electronicUnitName": "teknik ad",\n  "title": "Türkçe ürün başlığı",\n  "description": "kaynaklara dayalı, temkinli Türkçe ürün açıklaması",\n  "metaTitle": "SEO başlığı",\n  "metaDescription": "kısa SEO açıklaması",\n  "metaKeywords": ["anahtar", "kelimeler"],\n  "tags": ["etiketler"],\n  "confidence": 0,\n  "needsReview": true,\n  "reviewReason": "kısa sebep veya null"\n}`,
    maxOutputTokens: 3200,
  };
}

function normaliseProbableOemCodes(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values
    .map((value) => {
      if (typeof value === "string") return { code: value };
      if (!value || typeof value !== "object") return null;
      return {
        code: value.code || value.oemNumber || value.partNumber,
        confidence: Number.isFinite(Number(value.confidence)) ? Number(value.confidence) : undefined,
        sourceUrls: Array.isArray(value.sourceUrls) ? value.sourceUrls.filter((url) => typeof url === "string").slice(0, 5) : [],
      };
    })
    .map((value) => value ? { ...value, code: normaliseCode(value.code) } : null)
    .filter((value) => value && isPlausibleOem(value.code))
    .filter((value) => {
      const key = compactCode(value.code);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function harvestSearchOemCandidates(search) {
  const candidates = [];
  for (const source of search?.sources || []) {
    const haystack = `${source.title || ""} ${source.text || ""}`;
    const matches = haystack.match(/\b[A-Z0-9][A-Z0-9./_-]{5,23}\d[A-Z0-9./_-]*\b/gi) || [];
    for (const match of matches) {
      const code = normaliseCode(match);
      if (!isPlausibleOem(code)) continue;
      candidates.push({
        code,
        confidence: 0.35,
        sourceUrls: source.url ? [source.url] : [],
      });
    }
  }
  return normaliseProbableOemCodes(candidates);
}

function stripUnverifiedCodes(value, candidates) {
  let cleaned = nullableString(value) || "";
  for (const candidate of candidates || []) {
    for (const token of [candidate.code, compactCode(candidate.code)]) {
      if (token && token.length >= 6) cleaned = cleaned.split(token).join(" ");
    }
  }
  return cleaned.replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
}

function createFallbackEnrichment(product, vision, search) {
  const probableOemCodes = normaliseProbableOemCodes([]);
  const brand = nullableString(vision.brand) || detectBrand(product.sourceBrandFolder);
  const manufacturer = nullableString(vision.manufacturer) || brand;
  const partType = nullableString(vision.partType) || "Oto Elektronik Parçası";
  const oem = vision.oemReadStatus === "clear" && isPlausibleOem(vision.oemNumber) ? normaliseCode(vision.oemNumber) : null;
  const displayOem = oem || "İNCELEME GEREKLİ";
  const needsReview = !oem || search.status !== "found" || Number(vision.confidence || 0) < 0.9;
  return {
    oemNumber: oem,
    visibleOemNumber: oem,
    oemSource: oem ? "image" : probableOemCodes.length > 0 ? "web" : "unresolved",
    probableOemCodes,
    brand,
    model: nullableString(vision.model),
    partType,
    manufacturer,
    electronicUnitName: nullableString(vision.electronicUnitName) || partType,
    title: `${brand} ${partType} ${displayOem} Orijinal Çıkma`,
    description: `${displayOem} ${brand} ${partType}
${displayOem}, ${brand} araçlarda kullanılan orijinal ${partType} parçasıdır. Görsel ve kaynak doğrulaması tamamlanmadığı için kesin uyumluluk veya OEM iddiasında bulunulmamıştır.

Ürün Bilgileri
Ürün: ${partType}
Marka: ${brand}
Model: ${nullableString(vision.model) || "Belirtilmemiş / doğrulanamadı"}
Parça Kodu: ${displayOem}
OEM Referansı: Belirtilmemiş / doğrulanamadı
Alternatif Referans: Belirtilmemiş / doğrulanamadı
Parça Tipi: ${partType}
Sistem: Belirtilmemiş / doğrulanamadı

Referans Kodları
${displayOem}
Belirtilmemiş / doğrulanamadı
Görsel ve kaynak doğrulaması tamamlanmadan çapraz referans kesin kabul edilmemelidir.

Uyumlu Araçlar
Marka | Model | Motor | Model Yılı
${brand} | ${nullableString(vision.model) || "Belirtilmemiş / doğrulanamadı"} | Belirtilmemiş / doğrulanamadı | Belirtilmemiş / doğrulanamadı

Uyumluluk; parça kodu, soket, donanım versiyonu ve mümkünse VIN üzerinden teyit edilmelidir.

Ürün Açıklaması
Parçanın teknik çalışma prensibi ve montaj detayları kaynaklarla doğrulanmadığı için burada kesin teknik özellik belirtilmemiştir.
Uyumsuzluk halinde çalışmama, iletişim kaybı veya sistem arızası görülebilir.
Montaj öncesinde soket bağlantıları ve çıkma parça durumu uzman servis tarafından kontrol edilmelidir.

Uyumluluk Uyarısı
Mevcut parçanız üzerindeki referans numarasını, soketlerini, pin yapısını ve varsa sağ/sol yön bilgisini bu ürünle birebir karşılaştırınız.
Sipariş öncesinde mümkünse araç şase (VIN) numarasıyla uyumluluk teyidi alınmalıdır.`,
    metaTitle: `${displayOem} ${brand} ${partType} | Beyindeposu`,
    metaDescription: `${brand} ${partType} için ${displayOem} numaralı oto elektronik parça.`,
    metaKeywords: [displayOem, brand, partType, "oto elektronik", "Beyindeposu"],
    tags: [displayOem, brand, partType, "Orijinal Çıkma"],
    confidence: Number(vision.confidence || 0),
    needsReview,
    reviewReason: needsReview ? "OCR veya web doğrulaması yeterli değil" : null,
  };
}

function buildReviewCodes(vision = {}, enrichment = {}) {
  const candidate = (code, kind, source, confidence) => ({
    code,
    kind,
    ...(source ? { source } : {}),
    ...(Number.isFinite(Number(confidence)) ? { confidence: Number(confidence) } : {}),
  });
  const candidates = [
    candidate(vision.oemNumber, "oem_candidate", "image", vision.confidence),
    ...(Array.isArray(vision.candidateCodes) ? vision.candidateCodes.map((code) => candidate(code, "oem_candidate", "image", Math.min(Number(vision.confidence || 0), 0.75))) : []),
    candidate(enrichment.oemNumber, "oem_candidate", "image", enrichment.confidence),
    ...(Array.isArray(enrichment.candidateCodes) ? enrichment.candidateCodes.map((code) => candidate(code, "oem_candidate", "web", enrichment.confidence)) : []),
    ...normaliseProbableOemCodes(enrichment.probableOemCodes).map((item) => candidate(item.code, "oem_candidate", "web", item.confidence)),
    ...(Array.isArray(vision.secondaryCodes) ? vision.secondaryCodes.map((code) => candidate(code, "secondary_code", "image", vision.confidence)) : []),
    ...(Array.isArray(enrichment.secondaryCodes) ? enrichment.secondaryCodes.map((code) => candidate(code, "secondary_code", "web", enrichment.confidence)) : []),
  ];
  const seen = new Set();
  return candidates
    .map((item) => ({ ...item, code: normaliseCode(item.code) }))
    .filter((item) => isPlausibleOem(item.code))
    .filter((item) => {
      const key = `${item.kind}:${compactCode(item.code)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function buildProductDocument(product, vision, enrichment, categoryMap, imageUrls) {
  const visionOem = vision.oemReadStatus === "clear" && isPlausibleOem(vision.oemNumber) ? normaliseCode(vision.oemNumber) : null;
  const enrichedOem = isPlausibleOem(enrichment.oemNumber) ? normaliseCode(enrichment.oemNumber) : null;
  const webCandidates = normaliseProbableOemCodes(enrichment.probableOemCodes);
  const enrichmentConflictsWithVision = Boolean(visionOem && enrichedOem && compactCode(visionOem) !== compactCode(enrichedOem));
  // A web-derived code is never promoted automatically. Only a complete visual
  // read can populate the definitive oemNumber field; everything else stays review-only.
  const oem = visionOem && !enrichmentConflictsWithVision ? visionOem : null;
  const needsReview = Boolean(enrichment.needsReview) || enrichmentConflictsWithVision || !oem;
  const reviewReason = needsReview
    ? enrichment.reviewReason || (!oem ? "Görsel OEM ile kaynak OEM eşleşmedi" : "Kaynak veya OCR doğrulaması yetersiz")
    : undefined;
  const brand = nullableString(enrichment.brand) || nullableString(vision.brand) || detectBrand(product.sourceBrandFolder);
  const model = nullableString(enrichment.model) || nullableString(vision.model) || undefined;
  const partType = nullableString(enrichment.partType) || nullableString(vision.partType) || "Oto Elektronik Parçası";
  const manufacturer = nullableString(enrichment.manufacturer) || nullableString(vision.manufacturer) || brand;
  const fallbackTitle = `${brand} ${partType} ${oem || "İnceleme Bekliyor"} Orijinal Çıkma`;
  const title = oem
    ? (nullableString(enrichment.title) || fallbackTitle)
    : (stripUnverifiedCodes(enrichment.title, webCandidates) || fallbackTitle);
  const description = nullableString(enrichment.description) || createFallbackEnrichment(product, vision, { status: "no_results" }).description;
  const opaqueProductToken = crypto
    .createHash("sha1")
    .update(`${product.id}:${product.shelfCode}`)
    .digest("hex")
    .slice(0, 10);
  const safeIdentity = `${slugify(oem || "inceleme")}-${opaqueProductToken}`;
  const slug = `${slugify(brand)}-${safeIdentity}`;
  const categorySlug = detectCategorySlug(`${product.sourceFolder}/${product.sourceBrandFolder}`);
  const categoryId = categoryMap[categorySlug] || Object.values(categoryMap)[0];
  const metaKeywords = Array.isArray(enrichment.metaKeywords)
    ? enrichment.metaKeywords
      .filter((value) => typeof value === "string")
      .filter((value) => oem || !webCandidates.some((candidate) => compactCode(value) === compactCode(candidate.code)))
      .slice(0, 20)
    : [oem || "İNCELEME GEREKLİ", brand, partType, "oto elektronik"];
  const tags = Array.isArray(enrichment.tags)
    ? enrichment.tags
      .filter((value) => typeof value === "string")
      .filter((value) => oem || !webCandidates.some((candidate) => compactCode(value) === compactCode(candidate.code)))
      .slice(0, 20)
    : [oem || "İNCELEME GEREKLİ", brand, partType, "Orijinal Çıkma"];
  const reviewCodes = needsReview ? buildReviewCodes(vision, enrichment) : [];
  const oemSource = oem
    ? "image"
    : webCandidates.length > 0
      ? "web"
      : "unresolved";

  return {
    title: title.slice(0, 300),
    slug: slug.slice(0, 300),
    oemNumber: oem || "İNCELEME GEREKLİ",
    oemSource,
    ...(vision.visibleOemNumber ? { visibleOemNumber: normaliseCode(vision.visibleOemNumber) } : {}),
    shelfCode: product.shelfCode,
    categoryId,
    brand,
    ...(model ? { model: model.slice(0, 200) } : {}),
    condition: "Orijinal Çıkma",
    inStock: true,
    description: description.slice(0, 12000),
    images: imageUrls,
    metaTitle: (oem ? (nullableString(enrichment.metaTitle) || title) : (stripUnverifiedCodes(enrichment.metaTitle, webCandidates) || title)).slice(0, 300),
    metaDescription: (nullableString(enrichment.metaDescription) || description).slice(0, 1000),
    metaKeywords: metaKeywords.join(", "),
    tags: [...new Set([...tags, manufacturer, ...(oem ? [oem] : []), needsReview ? "İnceleme Gerekli" : "Doğrulanmış OEM"])].slice(0, 30),
    needsReview,
    ...(reviewReason ? { reviewReason: reviewReason.slice(0, 500) } : {}),
    ...(reviewCodes.length > 0 ? { reviewCodes } : {}),
  };
}

function matchesResultConfig(record, config) {
  return record?.pipelineVersion === IMPORT_PIPELINE_VERSION
    && record.model === config.model
    && record.provider === config.provider
    && record.run === config.run
    && record.useWebSearch === config.useWebSearch
    && record.singleFetch === config.singleFetch;
}

function loadPreviousResults(resultPath, checkpointPath, config) {
  const results = new Map();
  if (fs.existsSync(resultPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      if (matchesResultConfig(parsed, config)) {
        for (const result of parsed.results || []) {
          if (result.status !== "dry_run") results.set(result.id, result);
        }
      }
    } catch {
      // The append-only checkpoint below remains the recovery source.
    }
  }

  if (fs.existsSync(checkpointPath)) {
    try {
      for (const line of fs.readFileSync(checkpointPath, "utf8").split(/\r?\n/)) {
        if (!line.trim()) continue;
        const checkpoint = JSON.parse(line);
        if (matchesResultConfig(checkpoint, config) && checkpoint.result?.status !== "dry_run") {
          results.set(checkpoint.result.id, checkpoint.result);
        }
      }
    } catch {
      // A partial final line is ignored; completed lines remain usable.
    }
  }
  return results;
}

function appendResultCheckpoint(checkpointPath, config, result) {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  fs.appendFileSync(
    checkpointPath,
    `${JSON.stringify({
      pipelineVersion: IMPORT_PIPELINE_VERSION,
      model: config.model,
      provider: config.provider,
      run: config.run,
      useWebSearch: config.useWebSearch,
      singleFetch: config.singleFetch,
      recordedAt: new Date().toISOString(),
      result,
    })}\n`,
    "utf8",
  );
}

function writeResultSummary(resultPath, config) {
  atomicWrite(resultPath, {
    generatedAt: new Date().toISOString(),
    pipelineVersion: IMPORT_PIPELINE_VERSION,
    model: config.model,
    provider: config.provider,
    run: config.run,
    useWebSearch: config.useWebSearch,
    singleFetch: config.singleFetch,
    budgetUsd: config.budgetUsd,
    totalCostUsd: config.totalCostUsd,
    checkpointPath: config.checkpointPath,
    results: [...config.resultsById.values()],
  });
}

function showHelp() {
  console.log("  --db-batch-size <n>     Convex/checkpoint batch boyutu (varsayılan 25, en fazla 40)");
  console.log("  --request-timeout-ms <n> Gateway isteği timeout süresi (varsayılan 120000)");
  console.log(`Local Upload | Vercel AI Gateway GLM 5.3 Flash ürün eşleştirme\n\nSeçenekler:\n  --input <path>          Manifest yolu (varsayılan .tms-import/manifest.json)\n  --zip <path>            data.zip yolu\n  --limit <n>             İşlenecek ürün sayısı\n  --offset <n>            Başlangıç offset'i\n  --run                   Gateway model çağrılarını gerçekten çalıştır\n  --no-write              Convex'e ürün/görsel yazma (varsayılan: yaz)\n  --reset                 Yazma açıkken mevcut ürünleri temizle\n  --budget-usd <n>        Tahmini Gateway bütçesi\n  --concurrency <n>       Paralel ürün sayısı (varsayılan 1; rate limit için sıralı)\n  --delay-ms <n>          Ürünler arası bekleme\n  --max-results <n>       Exa sonuç sayısı (varsayılan 2)\n  --normalized-dir <path> Hazır WebP klasörü (varsayılan .tms-import/normalized-images)\n  --no-prepared-images    Hazır WebP klasörünü kullanma, işlem sırasında dönüştür\n  --no-web-search         Exa web aramasını kapat\n  --single-fetch          Searchsüz modda görsel + ürün JSON'ını tek model isteğinde üret\n  --model <id>            Gateway model ID (varsayılan zai/glm-5.3-flash)\n  --provider <id>         Gateway provider (varsayılan zai; yalnızca bu provider kullanılır)\n\nÖrnek:\n  npm run upload:local -- --run --no-web-search --single-fetch --limit 5 --budget-usd 1\n  npm run upload:local -- --run --no-write --limit 1 --budget-usd 0.25`);
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    showHelp();
    return;
  }

  loadEnvironmentFile(path.join(process.cwd(), ".env.local"));

  const inputPath = readOption("--input", DEFAULT_MANIFEST);
  const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const zipPath = readOption("--zip", manifest.sourceZip || process.env.TMS_DATA_ZIP || DEFAULT_ZIP);
  const outputDirectory = readOption("--out", path.dirname(inputPath) || DEFAULT_OUTPUT_DIR);
  const resultPath = path.join(outputDirectory, "ai-gateway-product-results.json");
  const checkpointPath = path.join(outputDirectory, "ai-gateway-product-results.ndjson");
  const reviewPath = path.join(outputDirectory, "ai-gateway-review.csv");
  const imageCacheDirectory = path.join(outputDirectory, "ai-gateway-image-cache");
  const normalizedImageDirectory = path.resolve(readOption("--normalized-dir", DEFAULT_NORMALIZED_IMAGE_DIR));
  const usePreparedImages = !hasFlag("--no-prepared-images");
  const run = hasFlag("--run");
  const write = !hasFlag("--no-write");
  const reset = hasFlag("--reset");
  const useWebSearch = !hasFlag("--no-web-search");
  const singleFetch = hasFlag("--single-fetch");
  const limit = Number.parseInt(readOption("--limit", String(manifest.products.length)), 10);
  const offset = Number.parseInt(readOption("--offset", "0"), 10);
  const concurrency = Number.parseInt(readOption("--concurrency", "1"), 10);
  const delayMs = Number.parseInt(readOption("--delay-ms", "0"), 10);
  const dbBatchSize = Number.parseInt(readOption("--db-batch-size", String(DEFAULT_DB_BATCH_SIZE)), 10);
  const requestTimeoutMs = Number.parseInt(readOption("--request-timeout-ms", String(DEFAULT_GATEWAY_REQUEST_TIMEOUT_MS)), 10);
  const maxResults = Number.parseInt(readOption("--max-results", "2"), 10);
  const maxDimension = Number.parseInt(readOption("--max-dimension", "1600"), 10);
  const webpQuality = Number.parseInt(readOption("--webp-quality", "82"), 10);
  const budgetUsd = Number.parseFloat(readOption("--budget-usd", "0"));
  const model = readOption("--model", process.env.TMS_AI_MODEL || DEFAULT_MODEL);
  const provider = readOption("--provider", process.env.TMS_AI_PROVIDER || DEFAULT_PROVIDER);

  if (!fs.existsSync(zipPath)) throw new Error(`Arşiv bulunamadı: ${zipPath}`);
  if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit pozitif bir tam sayı olmalıdır.");
  if (!Number.isInteger(offset) || offset < 0) throw new Error("--offset sıfır veya pozitif bir tam sayı olmalıdır.");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 12) throw new Error("--concurrency 1-12 arasında olmalıdır.");
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 300000) throw new Error("--delay-ms 0-300000 arasında olmalıdır.");
  if (!Number.isInteger(dbBatchSize) || dbBatchSize < 1 || dbBatchSize > 40) throw new Error("--db-batch-size 1-40 arasında olmalıdır.");
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 30000 || requestTimeoutMs > 600000) throw new Error("--request-timeout-ms 30000-600000 arasında olmalıdır.");
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10) throw new Error("--max-results 1-10 arasında olmalıdır.");
  if (run && (!Number.isFinite(budgetUsd) || budgetUsd <= 0)) throw new Error("--run için --budget-usd zorunludur.");
  if (run && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw new Error("AI_GATEWAY_API_KEY veya VERCEL_OIDC_TOKEN .env.local içinde tanımlı değil.");
  if (!MODEL_PRICING_PER_MILLION[model]) throw new Error(`Bu importer için fiyat tanımı olmayan model seçildi: ${model}`);
  if (provider !== DEFAULT_PROVIDER) throw new Error(`Bu importer yalnızca ${DEFAULT_PROVIDER} provider'ını destekliyor: ${provider}`);
  if (singleFetch && useWebSearch) throw new Error("--single-fetch yalnızca --no-web-search ile birlikte kullanılabilir.");
  if (reset && !write) throw new Error("--reset yalnızca yazma açıkken kullanılabilir; --no-write ile birlikte kullanılamaz.");

  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || process.env.TMS_CONVEX_URL || "";
  if (write && !convexUrl) throw new Error("Yazma açıkken CONVEX_URL veya NEXT_PUBLIC_CONVEX_URL tanımlı değil.");

  const selectedProducts = manifest.products.slice(offset, offset + limit);
  const zip = new AdmZip(zipPath);
  const entries = new Map(zip.getEntries().filter((entry) => !entry.isDirectory).map((entry) => [entry.entryName, entry]));
  const previousResults = run
    ? loadPreviousResults(resultPath, checkpointPath, { model, provider, run, useWebSearch, singleFetch })
    : new Map();
  const resultsById = new Map(previousResults);
  let totalCostUsd = run
    ? [...resultsById.values()].reduce((total, result) => total + Number(result.costUsd || 0), 0)
    : 0;
  let processed = 0;

  console.log(`Local Upload | provider=${provider} | model=${model} | products=${selectedProducts.length} | run=${run} | write=${write}`);
  console.log(`Kaynak: ${zipPath}`);
  console.log(`Exa araması: ${useWebSearch ? "AI Gateway üzerinden açık" : "kapalı"}`);
  console.log(`Convex yazımı: ${write ? "açık (kapatmak için --no-write)" : "kapalı"}`);
  console.log(`İstek modu: ${singleFetch ? "tek fetch (görsel -> ürün JSON)" : "OCR + zenginleştirme"}`);
  console.log(`Hazır WebP: ${usePreparedImages && fs.existsSync(normalizedImageDirectory) ? normalizedImageDirectory : "yok; gerektiğinde işlem sırasında üretilecek"}`);
  console.log(`Convex/checkpoint batch: ${dbBatchSize}`);

  const shouldPersist = Boolean(run && write);
  const productById = new Map(selectedProducts.map((product) => [product.id, product]));
  const convexClient = shouldPersist ? new ConvexHttpClient(convexUrl) : null;
  let categoryMap = {};
  let resetApplied = false;
  if (shouldPersist) {
    const initResult = await convexClient.mutation(api.importData.initCategoriesAndBrands, {});
    categoryMap = initResult.categoryMap;
  }

  async function persistResults(batchResults) {
    const resultsToPersist = batchResults.filter((result) => reset || !result.dbWritten);
    if (!shouldPersist || resultsToPersist.length === 0) return;

    const documents = [];
    for (const result of resultsToPersist) {
      const product = productById.get(result.id);
      if (!product) continue;
      const document = buildProductDocument(product, result.vision || {}, result.enrichment || {}, categoryMap, result.imageUrls || []);
      result.document = document;
      documents.push(document);
    }

    if (reset && !resetApplied) {
      let remaining = true;
      let deleted = 0;
      while (remaining) {
        const deletion = await convexClient.mutation(api.importData.cleanProductsBatch, { limit: 500 });
        deleted += deletion.deleted;
        remaining = deletion.remaining;
      }
      resetApplied = true;
      console.log(`Convex ürünleri temizlendi: ${deleted}`);
    }

    for (let index = 0; index < documents.length; index += 40) {
      const documentBatch = documents.slice(index, index + 40);
      const writeResult = await convexClient.mutation(api.importData.upsertProductsByShelfCode, { products: documentBatch });
      console.log(`Convex yazımı: ${Math.min(index + documentBatch.length, documents.length)}/${documents.length} (yeni: ${writeResult.inserted}, güncellenen: ${writeResult.updated})`);
    }
    for (const result of resultsToPersist) result.dbWritten = true;
  }

  async function processProduct(product) {
    if (run && totalCostUsd >= budgetUsd) {
      return { id: product.id, shelfCode: product.shelfCode, status: "budget_reached", costUsd: 0 };
    }
    const imageRecords = [];
    for (const image of product.images) {
      const entry = entries.get(image.archivePath);
      if (!entry) continue;
      const optimised = await prepareImage(
        entry,
        image,
        imageCacheDirectory,
        maxDimension,
        webpQuality,
        usePreparedImages ? normalizedImageDirectory : null,
      );
      imageRecords.push({ ...image, index: image.photoNumber || imageRecords.length + 1, ...optimised });
    }
    if (!imageRecords.length) {
      return { id: product.id, shelfCode: product.shelfCode, status: "needs_review", reviewReason: "Arşiv görseli bulunamadı", costUsd: 0 };
    }
    if (!run) {
      return {
        id: product.id,
        shelfCode: product.shelfCode,
        sourceFolder: product.sourceFolder,
        status: "dry_run",
        imageCount: imageRecords.length,
        imageBytes: imageRecords.reduce((total, image) => total + image.bytes, 0),
        costUsd: 0,
      };
    }

    if (singleFetch) {
      const singleAnswer = await requestGatewayJson(makeSingleFetchRequest(imageRecords, model, provider), `single-fetch ${product.shelfCode}`, requestTimeoutMs);
      totalCostUsd += singleAnswer.costUsd;
      const vision = normaliseVisionPayload(singleAnswer.parsed);
      const search = { status: "disabled", queries: [], sources: [], costUsd: 0, usage: null };
      const enrichment = {
        ...createFallbackEnrichment(product, vision, search),
        ...singleAnswer.parsed,
        oemNumber: vision.oemNumber,
        visibleOemNumber: vision.visibleOemNumber,
        oemSource: vision.oemNumber ? "image" : "unresolved",
        probableOemCodes: [],
        needsReview: true,
        reviewReason: typeof singleAnswer.parsed.reviewReason === "string" && singleAnswer.parsed.reviewReason.trim()
          ? singleAnswer.parsed.reviewReason.trim()
          : "Web doğrulaması yapılmadı; bilgiler yalnızca görsel ve model eğitimiyle üretildi",
      };
      const result = {
        id: product.id,
        shelfCode: product.shelfCode,
        sourceFolder: product.sourceFolder,
        sourceBrandFolder: product.sourceBrandFolder,
        status: "completed",
        mode: "single_fetch_no_web_search",
        imageCount: imageRecords.length,
        vision,
        search,
        enrichment,
        costUsd: singleAnswer.costUsd,
        usage: { singleFetch: singleAnswer.usage },
      };
      if (write) {
        result.imageUrls = await saveProductAssets(product, result, imageRecords);
      }
      return result;
    }

    const visionAnswer = await requestGatewayJson(makeVisionRequest(imageRecords, model, provider), `vision ${product.shelfCode}`, requestTimeoutMs);
    totalCostUsd += visionAnswer.costUsd;
    const vision = normaliseVisionPayload(visionAnswer.parsed);
    // Partial OCR results are review candidates, not search keys. If there is no
    // clear visual OEM, search must fall back to the product identity instead.
    const oemCandidates = vision.oemReadStatus === "clear" && isPlausibleOem(vision.oemNumber)
      ? [vision.oemNumber]
      : [];

    let search = { status: "disabled", queries: [], sources: [], costUsd: 0, usage: null };
    if (useWebSearch) {
      search = await searchGatewayForProduct({
        oemCandidates,
        manufacturer: vision.manufacturer,
        brand: vision.brand,
        modelName: vision.model,
        partType: vision.partType,
        electronicUnitName: vision.electronicUnitName,
        sourceFolder: product.sourceFolder,
        sourceBrandFolder: product.sourceBrandFolder,
        maxResults,
        requestTimeoutMs,
        model,
        provider,
      });
    }
    totalCostUsd += Number(search.costUsd || 0);

    if (totalCostUsd >= budgetUsd) {
      return {
        id: product.id,
        shelfCode: product.shelfCode,
        sourceFolder: product.sourceFolder,
        status: "budget_reached_after_vision",
        vision,
        search,
        costUsd: visionAnswer.costUsd + Number(search.costUsd || 0),
        usage: { vision: visionAnswer.usage, search: search.usage },
      };
    }

    const enrichmentAnswer = await requestGatewayJson(makeEnrichmentRequest(product, vision, search, model, provider), `enrichment ${product.shelfCode}`, requestTimeoutMs);
    totalCostUsd += enrichmentAnswer.costUsd;
    const rawEnrichmentOem = normaliseCode(enrichmentAnswer.parsed.oemNumber);
    const parsedProbableCodes = normaliseProbableOemCodes([
      ...normaliseProbableOemCodes(enrichmentAnswer.parsed.probableOemCodes),
      ...harvestSearchOemCandidates(search),
    ]);
    const enrichment = {
      ...createFallbackEnrichment(product, vision, search),
      ...enrichmentAnswer.parsed,
      // Never allow a web-derived answer to silently become the definitive OEM.
      oemNumber: vision.oemReadStatus === "clear" && isPlausibleOem(vision.oemNumber)
        ? (rawEnrichmentOem && compactCode(rawEnrichmentOem) === compactCode(vision.oemNumber) ? vision.oemNumber : null)
        : null,
      visibleOemNumber: vision.visibleOemNumber,
      probableOemCodes: [
        ...parsedProbableCodes,
        ...(rawEnrichmentOem && (!vision.oemNumber || compactCode(rawEnrichmentOem) !== compactCode(vision.oemNumber))
          ? [{ code: rawEnrichmentOem, confidence: Number(enrichmentAnswer.parsed.confidence || 0), sourceUrls: [] }]
          : []),
      ],
      oemSource: vision.oemNumber ? "image" : parsedProbableCodes.length > 0 || rawEnrichmentOem ? "web" : "unresolved",
    };
    const result = {
      id: product.id,
      shelfCode: product.shelfCode,
      sourceFolder: product.sourceFolder,
      sourceBrandFolder: product.sourceBrandFolder,
      status: "completed",
      imageCount: imageRecords.length,
      vision,
      search: {
        status: search.status,
        engine: search.engine || "exa",
        queries: search.queries,
        sources: search.sources.map((source) => ({ url: source.url, title: source.title, textLength: source.text.length })),
      },
      enrichment,
      costUsd: visionAnswer.costUsd + Number(search.costUsd || 0) + enrichmentAnswer.costUsd,
      usage: { vision: visionAnswer.usage, search: search.usage, enrichment: enrichmentAnswer.usage },
    };

    if (write) {
      result.imageUrls = await saveProductAssets(product, result, imageRecords);
    }
    return result;
  }

  async function saveProductAssets(product, result, imageRecords) {
    const vision = result.vision || {};
    const oem = isPlausibleOem(vision.oemNumber) ? normaliseCode(vision.oemNumber) : null;
    const opaqueProductToken = crypto
      .createHash("sha1")
      .update(`${product.id}:${product.shelfCode}`)
      .digest("hex")
      .slice(0, 10);
    const prefix = `${slugify(oem || "inceleme")}-${opaqueProductToken}`;
    const imageUrls = [];
    fs.mkdirSync(DEFAULT_UPLOAD_DIR, { recursive: true });
    for (let index = 0; index < imageRecords.length; index += 1) {
      const image = imageRecords[index];
      const fileName = `${prefix}-${index + 1}.webp`;
      const destination = path.join(DEFAULT_UPLOAD_DIR, fileName);
      fs.copyFileSync(image.filePath, destination);
      imageUrls.push(`/uploads/products/${fileName}`);
    }
    return imageUrls;
  }

  async function processBatch(batchProducts) {
    let nextIndex = 0;
    async function worker() {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= batchProducts.length) return;
        const product = batchProducts[currentIndex];
        const previous = resultsById.get(product.id);
        const canReuse = previous?.status === "completed" && (!write || (previous.imageUrls || []).length > 0);
        if (canReuse) {
          processed += 1;
          continue;
        }
        try {
          const result = await processProduct(product);
          resultsById.set(product.id, result);
          appendResultCheckpoint(checkpointPath, { model, provider, run, useWebSearch, singleFetch }, result);
          processed += 1;
          process.stdout.write(`\rİlerleme: ${processed}/${selectedProducts.length} | maliyet: $${totalCostUsd.toFixed(4)}`);
          if (delayMs > 0 && currentIndex < batchProducts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          const failed = {
            id: product.id,
            shelfCode: product.shelfCode,
            sourceFolder: product.sourceFolder,
            status: "error",
            error: error.message,
            costUsd: 0,
          };
          resultsById.set(product.id, failed);
          appendResultCheckpoint(checkpointPath, { model, provider, run, useWebSearch, singleFetch }, failed);
          processed += 1;
          console.error(`\n[${product.shelfCode}] ${error.message}`);
          if (delayMs > 0 && currentIndex < batchProducts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, batchProducts.length) }, () => worker()));
  }

  const resultConfig = {
    model,
    provider,
    run,
    useWebSearch,
    singleFetch,
    budgetUsd: run ? budgetUsd : null,
    checkpointPath,
    totalCostUsd,
    resultsById,
  };

  for (let batchStart = 0; batchStart < selectedProducts.length; batchStart += dbBatchSize) {
    if (run && totalCostUsd >= budgetUsd) {
      console.log("\nBütçe sınırına ulaşıldı; kalan ürünler sonraki çalıştırmaya bırakıldı.");
      break;
    }
    const batchProducts = selectedProducts.slice(batchStart, batchStart + dbBatchSize);
    await processBatch(batchProducts);
    const completedBatchResults = batchProducts
      .map((product) => resultsById.get(product.id))
      .filter((result) => result?.status === "completed");
    await persistResults(completedBatchResults);
    resultConfig.totalCostUsd = totalCostUsd;
    writeResultSummary(resultPath, resultConfig);
    console.log(`\nBatch checkpoint: ${Math.min(batchStart + batchProducts.length, selectedProducts.length)}/${selectedProducts.length}`);
  }
  console.log(`\nSonuç dosyası: ${resultPath}`);

  const completedResults = selectedProducts.map((product) => resultsById.get(product.id)).filter((result) => result?.status === "completed");
  const reviewRows = completedResults.map((result) => ({
    shelfCode: result.shelfCode,
    oem: result.document?.oemNumber || result.enrichment?.oemNumber || result.vision?.oemNumber || "",
    probableOems: (result.document?.reviewCodes || buildReviewCodes(result.vision || {}, result.enrichment || {}))
      .filter((candidate) => candidate.kind === "oem_candidate")
      .map((candidate) => candidate.code)
      .join(" | "),
    status: result.document?.needsReview ?? result.enrichment?.needsReview ? "İNCELEME GEREKLİ" : "HAZIR",
    reason: result.document?.reviewReason || result.enrichment?.reviewReason || "",
  }));
  const csvRows = [
    ["Raf Kodu", "OEM", "Muhtemel OEMler", "Durum", "Sebep"],
    ...reviewRows.map((row) => [row.shelfCode, row.oem, row.probableOems, row.status, row.reason]),
  ].map((row) => row.map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(","));
  fs.writeFileSync(reviewPath, `\uFEFF${csvRows.join("\n")}\n`, "utf8");
  console.log(`İnceleme CSV: ${reviewPath}`);

  resultConfig.totalCostUsd = totalCostUsd;
  writeResultSummary(resultPath, resultConfig);

  const needsReview = completedResults.filter((result) => result.document?.needsReview || result.enrichment?.needsReview).length;
  const failedResults = selectedProducts.map((product) => resultsById.get(product.id)).filter((result) => result?.status === "error");
  console.log(`Tamamlandı | ${model} tahmini Gateway maliyeti: $${totalCostUsd.toFixed(6)} | tamamlanan: ${completedResults.length} | inceleme: ${needsReview}`);
  if (failedResults.length > 0) {
    process.exitCode = 1;
    console.error(`Başarısız ürün: ${failedResults.length}. Ayrıntılar: ${resultPath}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  atomicWrite,
  buildProductDocument,
  createFallbackEnrichment,
  gatewayUsageCost,
  isPlausibleOem,
  loadEnvironmentFile,
  normaliseCode,
  optimiseImage,
  parseJsonObject,
  requestGatewayJson,
  searchGatewayForProduct,
  slugify,
  main,
};
