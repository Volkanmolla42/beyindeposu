/**
 * Toplu Ürün İçe Aktarma & Görselden OEM Çıkarma Scripti
 * 
 * Kullanım:
 *   npx tsx scripts/batch-import.ts [klasör_yolu] [seçenekler]
 * 
 * Seçenekler:
 *   --limit=1         Sadece belirtilen sayıda ürünü işler (varsayılan: 1 - test amaçlı)
 *   --limit=all       Tüm ürünleri işler
 *   --dry-run         AI analizi yapar fakat veritabanına ve dosya sistemine yazmaz
 *   --draft           Ürünleri taslak (isDraft: true) olarak kaydeder
 * 
 * Örnek:
 *   npx tsx scripts/batch-import.ts "C:\\Users\\volkan\\Desktop\\data.test-10" --limit=1
 *   npx tsx scripts/batch-import.ts "C:\\Users\\volkan\\Desktop\\data.test-10" --limit=all
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import {
  getVisionLookupSystemInstruction,
  formatCategoriesList,
  formatBrandsList,
  parseLlmJson,
  DEFAULT_GEMINI_MODELS,
} from "../src/lib/ai/oem-assistant";

// 1. Ortam Değişkenlerini Yükle (.env.local)
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}
loadEnvLocal();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!GEMINI_API_KEY) {
  console.error("❌ Hata: GEMINI_API_KEY ortam değişkeni bulunamadı (.env.local kontrol edin).");
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error("❌ Hata: NEXT_PUBLIC_CONVEX_URL ortam değişkeni bulunamadı (.env.local kontrol edin).");
  process.exit(1);
}

// 2. Argümanları Ayrıştır
const args = process.argv.slice(2);
let targetDir = "C:\\Users\\volkan\\Desktop\\data.test-10";
let limit: number | null = 1; // Güvenlik için varsayılan 1 ürün
let isDryRun = false;
let isDraft = false;

for (const arg of args) {
  if (arg.startsWith("--limit=")) {
    const val = arg.split("=")[1];
    limit = val.toLowerCase() === "all" ? null : parseInt(val, 10);
  } else if (arg === "--dry-run") {
    isDryRun = true;
  } else if (arg === "--draft") {
    isDraft = true;
  } else if (!arg.startsWith("--")) {
    targetDir = arg;
  }
}

interface ProductFolder {
  dirPath: string;
  shelfCode: string;
  categoryHint: string;
  brandHint: string;
  imageFiles: string[];
}

// 3. Klasör Ağacını Tara ve Ürünleri Grupla
function scanProductFolders(rootDir: string): ProductFolder[] {
  const products: ProductFolder[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const subdirs = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile());

    const imageFiles = files
      .map((f) => f.name)
      .filter((name) => /\.(webp|jpg|jpeg|png)$/i.test(name))
      .sort((a, b) => {
        // .1 veya .1_resized olan kapak görselini daima en başa al
        const aIsFirst = a.includes(".1.") || a.includes(".1_");
        const bIsFirst = b.includes(".1.") || b.includes(".1_");
        if (aIsFirst && !bIsFirst) return -1;
        if (!aIsFirst && bIsFirst) return 1;
        return a.localeCompare(b, undefined, { numeric: true });
      });

    // Eğer klasör içinde görsel dosyaları varsa, bu bir ürün klasörüdür
    if (imageFiles.length > 0) {
      const relPath = path.relative(rootDir, currentDir);
      const segments = relPath.split(path.sep);

      const shelfCode = path.basename(currentDir);
      const categoryHint = segments.length > 1 ? segments[0] : "Oto Elektronik";
      const brandHint = segments.length > 2 ? segments[1].replace(/^[0-9.]+\s*/, "") : "Genel";

      products.push({
        dirPath: currentDir,
        shelfCode,
        categoryHint,
        brandHint,
        imageFiles: imageFiles.map((f) => path.join(currentDir, f)),
      });
      return;
    }

    for (const subdir of subdirs) {
      walk(path.join(currentDir, subdir.name));
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }
  return products;
}

// 4. Kategori Eşleştirme Yardımcısı
function matchCategory(
  categories: any[],
  categoryHint: string,
  aiCategoryId?: string,
  aiCategoryName?: string
): any {
  // 1. Doğrudan AI tarafından eşleştirilen geçerli kategori ID'si
  if (aiCategoryId) {
    const found = categories.find((c) => c._id === aiCategoryId);
    if (found) return found;
  }

  // 2. AI Kategori Adı ile eşleşme
  if (aiCategoryName) {
    const cleanAiName = aiCategoryName.toLowerCase();
    const found = categories.find((c) =>
      c.name.toLowerCase().includes(cleanAiName) || cleanAiName.includes(c.name.toLowerCase())
    );
    if (found) return found;
  }

  // 3. Klasör adından kategori ipucu eşleştirme
  const hint = categoryHint.toLowerCase();
  if (hint.includes("ecu") || hint.includes("motor")) {
    return categories.find((c) => c.slug === "motor-beyinleri-ecu") || categories[0];
  }
  if (hint.includes("abs") || hint.includes("esp")) {
    return categories.find((c) => c.slug === "abs-esp-beyinleri") || categories[0];
  }
  if (hint.includes("airbag") || hint.includes("srs")) {
    return categories.find((c) => c.slug === "airbag-beyinleri") || categories[0];
  }
  if (hint.includes("sigorta")) {
    return categories.find((c) => c.slug === "sigorta-kutulari") || categories[0];
  }
  if (hint.includes("modül") || hint.includes("bcm") || hint.includes("bsi")) {
    return (
      categories.find((c) => c.slug === "bcm-bsi-sam-modulleri") ||
      categories.find((c) => c.slug === "konfor-modulleri") ||
      categories[0]
    );
  }

  return categories[0];
}

function slugify(text: string): string {
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
}

// 5. Ana Yürütme Fonksiyonu
async function main() {
  console.log("==========================================================");
  console.log("🚀 BEYİN DEPOSU - TOPLU ÜRÜN İÇE AKTARMA & AI OEM OKUYUCU");
  console.log("==========================================================");
  console.log(`📁 Hedef Klasör: ${targetDir}`);
  console.log(`⚙️  Mod: ${isDryRun ? "🧪 DRY RUN (Test - Kaydetmez)" : "💾 CANLI KAYIT"}`);
  console.log(`🎯 Limit: ${limit === null ? "Tüm Ürünler" : `${limit} Adet Ürün`}`);
  console.log(`📝 Durum: ${isDraft ? "Taslak Olarak" : "Doğrudan Yayında"}`);
  console.log("----------------------------------------------------------\n");

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Belirtilen klasör bulunamadı: ${targetDir}`);
    process.exit(1);
  }

  // Convex İstemcisini Başlat
  const convex = new ConvexHttpClient(CONVEX_URL!);
  const categories = await convex.query(api.categories.list, { onlyActive: false });
  const brands = await convex.query(api.brands.list, {});

  console.log(`✅ Convex Bağlantısı Başarılı: ${categories.length} kategori, ${brands.length} marka yüklendi.`);

  // Klasörleri Tara
  const allProducts = scanProductFolders(targetDir);
  console.log(`📦 Toplam ${allProducts.length} adet ürün klasörü tespit edildi.\n`);

  if (allProducts.length === 0) {
    console.warn("⚠️  İşlenecek ürün klasörü veya görsel bulunamadı.");
    return;
  }

  // Mevcut ürünleri çek ve zaten kayıtlı raf kodlarını belirle
  const existingProductsRes = await convex.query(api.products.getProductsPage, {
    draftStatus: "all",
    pageSize: 500,
  });
  const existingProductsByShelf = new Map<string, any>();
  for (const p of existingProductsRes.items) {
    if (p.shelfCode) {
      existingProductsByShelf.set(p.shelfCode.trim(), p);
    }
  }

  console.log(`📋 Sistemde halihazırda ${existingProductsByShelf.size} adet ürün/raf kodu kaydı var.`);

  const toProcess = limit !== null ? allProducts.slice(0, limit) : allProducts;
  console.log(`▶️  Şimdi ${toProcess.length} adet ürün inceleniyor...\n`);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const results: any[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    const indexLabel = `[${i + 1}/${toProcess.length}]`;
    console.log(`----------------------------------------------------------`);
    console.log(`${indexLabel} 🏷️  Raf Kodu: ${item.shelfCode}`);
    console.log(`       📂 Yol: ${path.basename(path.dirname(item.dirPath))}/${item.shelfCode}`);
    console.log(`       📸 Görsel Sayısı: ${item.imageFiles.length}`);
    console.log(`       🔍 Kategori İpucu: ${item.categoryHint} | Marka İpucu: ${item.brandHint}`);

    const existingProduct = existingProductsByShelf.get(item.shelfCode.trim());
    const isAlreadyCompleted =
      existingProduct &&
      existingProduct.oemNumber &&
      existingProduct.title &&
      existingProduct.oemNumber.trim() !== "" &&
      existingProduct.oemNumber.trim() !== item.shelfCode.trim();

    if (isAlreadyCompleted) {
      console.log(`       ⏭️  Bu raf kodu (${item.shelfCode}) zaten tamamlanmış (OEM: ${existingProduct.oemNumber}). Atlanıyor.`);
      results.push({
        status: "SKIPPED",
        shelfCode: item.shelfCode,
        oemNumber: existingProduct.oemNumber,
        note: "Zaten tamamlanmış",
      });
      continue;
    }

    if (existingProduct) {
      console.log(`       📝 Mevcut taslak bulundu (ID: ${existingProduct._id}), çoklu görsel AI analiziyle doldurulacak.`);
    }

    try {
      // 1. Ürünün tüm görsellerini base64 olarak hazırla (etiket hangi fotoğraftaysa AI görsün)
      const imagesToSend = item.imageFiles.slice(0, 4);
      const imageParts = imagesToSend.map((filePath) => {
        const bytes = fs.readFileSync(filePath);
        const mimeType = filePath.endsWith(".webp")
          ? "image/webp"
          : filePath.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
        return {
          inlineData: {
            data: bytes.toString("base64"),
            mimeType,
          },
        };
      });

      console.log(`       🤖 Gemini Vision ile ${imagesToSend.length} görsel etiket analizi için taranıyor...`);

      // 2. Gemini Vision İle OEM Analizi
      const systemPrompt = getVisionLookupSystemInstruction();
      const categoriesStr = formatCategoriesList(categories);
      const brandsStr = formatBrandsList(brands);

      const userPrompt = `Görsellerdeki parçayı ve etiketleri dikkatle incele. Parçanın ön, arka veya yan tarafındaki tüm etiketlerdeki kodları oku, ana OEM numarasını ve üretici (Bosch, Continental, Delphi, Siemens, ATE, Autoliv vb.) kodlarını tespit et ve JSON çıktısını üret.
Klasör İpuçları:
- Raf/Stok Kodu: ${item.shelfCode}
- Tahmini Kategori: ${item.categoryHint}
- Tahmini Marka: ${item.brandHint}

SİSTEMDE KAYITLI KATEGORİLER:
${categoriesStr}

SİSTEMDE KAYITLI MARKALAR:
${brandsStr}`;

      const modelsToTry = DEFAULT_GEMINI_MODELS;
      let aiResponse: any = null;
      let lastErr: any = null;

      for (const model of modelsToTry) {
        try {
          aiResponse = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { text: userPrompt },
                  ...imageParts,
                ],
              },
            ],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });
          if (aiResponse?.text) break;
        } catch (e: any) {
          lastErr = e;
        }
      }

      if (!aiResponse?.text) {
        throw new Error(`AI yanıtı alınamadı: ${lastErr?.message || "Bilinmeyen hata"}`);
      }

      const parsedData = parseLlmJson(aiResponse.text);
      const oem = parsedData.detectedOem?.trim();
      const detectedOem = (oem && oem !== item.shelfCode) ? oem : "İNCELEME GEREKLİ";
      const finalIsDraft = detectedOem === "İNCELEME GEREKLİ" ? true : isDraft;
      const detectedTitle = detectedOem === "İNCELEME GEREKLİ"
        ? `${parsedData.brand || item.brandHint} ${item.categoryHint} - Raf: ${item.shelfCode} (İNCELEME GEREKLİ)`
        : (parsedData.title || `${item.brandHint} ${detectedOem} Oto Elektronik Beyin`);

      console.log(`       ✨ TESPİT EDİLEN OEM: ${detectedOem}`);
      console.log(`       📌 Başlık: ${detectedTitle}`);
      console.log(`       🚗 Marka/Model: ${parsedData.brand || item.brandHint} - ${parsedData.model || "Genel"}`);

      // 3. Görselleri Sisteme Kopyala (Public/Uploads)
      const uploadedUrls: string[] = [];
      const cleanShelf = item.shelfCode.replace(/[^a-z0-9]/gi, "_");

      for (let imgIdx = 0; imgIdx < item.imageFiles.length; imgIdx++) {
        const srcFile = item.imageFiles[imgIdx];
        const ext = path.extname(srcFile);
        const destFileName = `product_${cleanShelf}_${imgIdx + 1}${ext}`;
        const destPath = path.join(uploadDir, destFileName);

        if (!isDryRun) {
          fs.copyFileSync(srcFile, destPath);
        }
        uploadedUrls.push(`/uploads/products/${destFileName}`);
      }

      // 4. Kategori Eşlemesi
      const matchedCategory = matchCategory(
        categories,
        item.categoryHint,
        parsedData.matchedCategoryId,
        parsedData.suggestedCategoryName
      );

      console.log(`       🗂️  Kategori: ${matchedCategory?.name || "Oto Elektronik"}`);

      // 5. Benzersiz Slug Üret
      const baseSlug = slugify(detectedTitle);
      const finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const isReview = detectedOem === "İNCELEME GEREKLİ";
      const finalModel = isReview ? "" : (parsedData.model || "Genel Uyumlu");
      const finalDescription = isReview ? "" : (parsedData.description || "");
      const finalMetaTitle = isReview ? "" : (parsedData.metaTitle || detectedTitle.slice(0, 60));
      const finalMetaDescription = isReview ? "" : (parsedData.metaDescription || "");
      const finalMetaKeywords = isReview ? "" : (parsedData.metaKeywords || "");
      const finalTags = isReview ? ["inceleme-gerekli"] : (parsedData.tags || [detectedOem, item.shelfCode]);

      // 6. Convex'e Ürünü Kaydet / Güncelle
      if (!isDryRun) {
        const payload = {
          title: detectedTitle,
          slug: finalSlug,
          oemNumber: detectedOem,
          shelfCode: item.shelfCode,
          categoryId: matchedCategory._id,
          brand: parsedData.brand || item.brandHint,
          model: finalModel,
          condition: parsedData.condition || "Orijinal Çıkma",
          inStock: true,
          description: finalDescription,
          images: existingProduct?.images?.length ? existingProduct.images : uploadedUrls,
          metaTitle: finalMetaTitle,
          metaDescription: finalMetaDescription,
          metaKeywords: finalMetaKeywords,
          tags: finalTags,
          isDraft: finalIsDraft,
        };

        const finalProductId = existingProduct
          ? (await convex.mutation(api.products.update, { id: existingProduct._id, ...payload }), existingProduct._id)
          : await convex.mutation(api.products.create, payload);

        console.log(`       ✅ Ürün Kaydedildi! (ID: ${finalProductId})`);

        results.push({
          status: "SUCCESS",
          shelfCode: item.shelfCode,
          oemNumber: detectedOem,
          title: detectedTitle,
          category: matchedCategory?.name,
          images: uploadedUrls.length,
          productId: finalProductId,
        });
      } else {
        console.log(`       🧪 DRY RUN: Veritabanına yazma atlandı.`);
        results.push({
          status: "DRY_RUN",
          shelfCode: item.shelfCode,
          oemNumber: detectedOem,
          title: detectedTitle,
          category: matchedCategory?.name,
          images: uploadedUrls.length,
        });
      }
    } catch (err: any) {
      console.error(`       ❌ Hata oluştu: ${err.message}`);
      results.push({
        status: "ERROR",
        shelfCode: item.shelfCode,
        error: err.message,
      });
    }

    // Kota limiti koruması için kısa bekleme (1.5 saniye)
    if (i < toProcess.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("\n==========================================================");
  console.log("🏁 İŞLEM ÖZETİ VE RAPOR");
  console.log("==========================================================");
  console.table(results);
}

main().catch((e) => {
  console.error("Beklenmeyen Hata:", e);
  process.exit(1);
});
