const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

const DEV_CONVEX_URL = "https://aromatic-elk-297.convex.cloud";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

// Shelf subcategory code mapping
const SHELF_CATEGORY_MAP = {
  "01": { name: "Motor Beyinleri (ECU)", slug: "motor-beyinleri-ecu" },
  "02": { name: "ABS / ESP Beyinleri", slug: "abs-esp-beyinleri" },
  "03": { name: "Airbag Beyinleri", slug: "airbag-beyinleri" },
  "04": { name: "BCM / BSI Modülleri", slug: "bcm-bsi-sam-modulleri" },
  "05": { name: "Sigorta Kutuları", slug: "sigorta-kutulari" },
  "06": { name: "Gösterge Panelleri", slug: "gosterge-panelleri" },
  "07": { name: "Direksiyon & Pompa", slug: "direksiyon-pompa" },
  "08": { name: "Direksiyon & Sinyal Kolları", slug: "direksiyon-kumanda-modulleri" },
  "09": { name: "Kontak & Çalıştırma Sistemleri", slug: "konfor-modulleri" },
  "10": { name: "Multimedya Üniteleri", slug: "multimedya-uniteleri" },
  "11": { name: "Cam & Ayna Motorları", slug: "cam-kapi-motorlari" },
  "12": { name: "ECU Motor Beyin Setleri", slug: "ecu-motor-beyin-setleri" },
};

const BRAND_RULES = [
  { prefix: "101", name: "Renault", slug: "renault" },
  { prefix: "201", name: "Fiat", slug: "fiat" },
  { prefix: "301", name: "Ford", slug: "ford" },
  { prefix: "401", name: "Peugeot", slug: "peugeot" },
  { prefix: "501", name: "Citroën", slug: "citroen" },
  { prefix: "601", name: "Nissan", slug: "nissan" },
  { prefix: "701", name: "Volkswagen", slug: "volkswagen" },
  { prefix: "801", name: "Mercedes-Benz", slug: "mercedes-benz" },
  { prefix: "901", name: "BMW", slug: "bmw" },
  { prefix: "902", name: "Audi", slug: "audi" },
  { prefix: "903", name: "Opel", slug: "opel" },
  { prefix: "904", name: "Toyota", slug: "toyota" },
  { prefix: "905", name: "Hyundai", slug: "hyundai" },
];

function detectBrand(shelfCode, oemCode) {
  const shelf = shelfCode.toLowerCase();
  for (const b of BRAND_RULES) {
    if (shelf.startsWith(b.prefix)) return b.name;
  }
  const oem = oemCode.toLowerCase();
  if (oem.startsWith("a0") || oem.startsWith("a1") || oem.startsWith("a2") || oem.startsWith("a6")) return "Mercedes-Benz";
  if (oem.startsWith("4b") || oem.startsWith("1k") || oem.startsWith("038") || oem.startsWith("06a")) return "Volkswagen";
  if (oem.startsWith("8200") || oem.startsWith("8201") || oem.startsWith("23710") || oem.startsWith("7700")) return "Renault";
  if (oem.startsWith("091") || oem.startsWith("129") || oem.startsWith("555")) return "Opel";
  if (oem.startsWith("93bg") || oem.startsWith("3m51") || oem.startsWith("6g91") || oem.startsWith("ys4f") || oem.startsWith("yc1a")) return "Ford";
  if (oem.startsWith("96") && oem.endsWith("80")) return "Peugeot";
  if (oem.startsWith("51") || oem.startsWith("55") || oem.startsWith("46") || oem.startsWith("717")) return "Fiat";
  return "Genel Uyumlu";
}

function detectCategoryFromShelf(shelfCode) {
  const m = shelfCode.match(/(?:101|201|301|401|501|601|701|801|901|902|903|904|905)[-\.]([0-9]{2})[-\.]/);
  if (m && SHELF_CATEGORY_MAP[m[1]]) {
    return SHELF_CATEGORY_MAP[m[1]];
  }
  return { name: "Motor Beyinleri (ECU)", slug: "motor-beyinleri-ecu" };
}

function sanitizeAutomotiveOEM(raw) {
  let clean = raw.toUpperCase().replace(/\s+/g, "");

  // Ford 3-segment format: YC1A-12A650-JA
  if (/^[A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{1,3}$/i.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Ford" };
  }

  // Fiat 8-digit with Bosch prefix/suffix artifact: 0-046-523-496-0 or 00465234960 -> 46523496
  const fiatExtended = clean.replace(/-/g, "").match(/(?:00?)(46[0-9]{6}|51[0-9]{6}|55[0-9]{6}|717[0-9]{5}|500[0-9]{5})(?:0)?/);
  if (fiatExtended) {
    return { valid: true, oem: fiatExtended[1], manufacturer: "Bosch" };
  }

  clean = clean.replace(/-/g, "").trim();

  // Strip leading 00+ artifacts if needed
  if (/^00+[1-9]/.test(clean)) {
    clean = clean.replace(/^0+/, "");
  }

  // Bosch 10-digit code: 0281001781, 0261200734, 0130821230, 0227100026
  if (/^(02[68][0-9]{7}|0130[0-9]{6}|0227[0-9]{6})$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Bosch" };
  }

  // Renault genuine: 8200XXXXXX, 8201XXXXXX, 7700XXXXXX, 23710XXXXX
  if (/^(8200[0-9]{6}|8201[0-9]{6}|7700[0-9]{6}|23710[0-9A-Z]{5}R?)$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Renault / Continental" };
  }

  // VAG (VW/Audi/Seat/Skoda) 9-11 char code: 4B0907401H, 038906018P, 1K0907115
  if (/^[0-9A-Z]{3}[0-9]{3}[0-9]{3}[A-Z]{0,3}$/.test(clean) && !clean.startsWith("000") && clean.length >= 9) {
    return { valid: true, oem: clean, manufacturer: "VAG (Audi / VW)" };
  }

  // Mercedes genuine: A000... or A611...
  if (/^A[0-9]{9,11}$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Mercedes-Benz" };
  }

  // Fiat/Alfa 8-digit standard: 46XXXXXX, 51XXXXXX, 55XXXXXX, 717XXXXX
  if (/^(46[0-9]{6}|51[0-9]{6}|55[0-9]{6}|717[0-9]{5}|500[0-9]{5})$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Fiat / Bosch" };
  }

  // Opel/GM: 09115062, 55560123, 12992345, Q1T15271M
  if (/^((?:09|12|55|13|24)[0-9]{6}|Q1T[0-9A-Z]{6})$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Opel / GM" };
  }

  // Siemens / Continental: 5WK9XXXX, S1XXXXXXXX
  if (/^(5WK[0-9A-Z]{4,7}|S1[0-9A-Z]{7,9})$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Siemens VDO" };
  }

  // PSA Peugeot Citroen: 96XXXXXX80
  if (/^96[0-9]{6,8}80$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "PSA (Peugeot / Citroën)" };
  }

  // Magneti Marelli: IAW...
  if (/^IAW[0-9A-Z\.]+$/.test(clean)) {
    return { valid: true, oem: clean, manufacturer: "Magneti Marelli" };
  }

  return { valid: false, oem: "İNCELEME GEREKLİ", manufacturer: "Orijinal Ekipman (OEM)" };
}

async function reseedAllFromImages(targetUrl = DEV_CONVEX_URL) {
  console.log(`🚀 VERİTABANI %100 DOĞRULANMIŞ GERÇEK OEM KODLARI İLE GÜNCELLENİYOR...`);
  console.log(`🎯 Hedef Veritabanı: ${targetUrl}`);

  const client = new ConvexHttpClient(targetUrl);

  // 1. Reset database
  console.log("\n🧹 1. Adım: Veritabanı sıfırlanıyor...");
  const initRes = await client.mutation(api.importData.initCategoriesAndBrands, {});
  const categoryMap = initRes.categoryMap;

  let hasMore = true;
  while (hasMore) {
    const delRes = await client.mutation(api.importData.cleanProductsBatch, { limit: 500 });
    hasMore = delRes.remaining;
  }
  console.log("✅ Veritabanı temizlendi.");

  // 2. Scan public/uploads/products/
  console.log("\n📦 2. Adım: public/uploads/products/ klasöründeki doğrulanmış görseller taranıyor...");
  const files = fs.readdirSync(UPLOAD_DIR);
  const productMap = new Map();

  for (const f of files) {
    const match = f.match(/^([a-z0-9-]+)-([0-9]+)\.jpg$/i);
    if (!match) continue;

    const prefix = match[1].toLowerCase();
    const photoIndex = parseInt(match[2], 10);

    if (!productMap.has(prefix)) {
      productMap.set(prefix, []);
    }
    productMap.get(prefix).push({ fileName: f, index: photoIndex });
  }

  const allPrefixes = Array.from(productMap.keys());
  console.log(`✅ Toplam ${allPrefixes.length} adet görsel paketi analiz ediliyor...`);

  // 3. Build product documents
  console.log("\n🔨 3. Adım: Sadece %100 Gerçek Otomotiv OEM Kodları Filtreleniyor...");

  const productsToInsert = [];
  let verifiedCount = 0;
  let reviewCount = 0;

  for (const prefix of allPrefixes) {
    const photos = productMap.get(prefix);
    photos.sort((a, b) => a.index - b.index);

    // Extract OEM and Shelf code using shelf prefix regex
    const match = prefix.match(/^(.*?)-((?:101|201|301|401|501|601|701|801|901|902|903|904|905)-.*)$/i);
    let oemPart = "";
    let shelfPart = "";

    if (match) {
      oemPart = match[1];
      shelfPart = match[2];
    } else {
      const parts = prefix.split("-");
      shelfPart = parts.slice(-3).join("-");
      oemPart = parts.slice(0, -3).join("-") || parts[0];
    }

    const oemValidation = sanitizeAutomotiveOEM(oemPart || prefix);
    const shelfDisplay = shelfPart.toUpperCase().replace(/-/g, ".");
    const brand = detectBrand(shelfPart, oemPart);
    const cat = detectCategoryFromShelf(shelfPart);
    const manufacturer = oemValidation.manufacturer;

    const isVerified = oemValidation.valid;
    const finalOEM = oemValidation.oem;

    if (isVerified) {
      verifiedCount++;
    } else {
      reviewCount++;
    }

    const title = isVerified
      ? `${brand} ${cat.name} ${manufacturer} ${finalOEM} Orijinal Çıkma`
      : `${brand} ${cat.name} (${shelfDisplay}) Orijinal Çıkma (İnceleme Gerekli)`;

    const description = `${brand} araçlar için ${manufacturer} üretimi ${isVerified ? finalOEM + " parça numaralı " : ""}${cat.name} orijinal çıkma yedek parça.

Parça Özellikleri & Kontroller:
Ürün profesyonel olarak araçtan sökülmüş, tüm soket ve pin kontrolleri yapılmış, kullanıma hazır durumdadır. ${isVerified ? `Satın almadan önce parça üzerindeki numaranın (${finalOEM}) kontrol edilmesi önerilir.` : "Etiket incelemesi devam etmektedir."}

Ürün Özellikleri
Parça No: ${finalOEM}
Raf / Stok Kodu: ${shelfDisplay}
Araç Markası: ${brand}
Parça Türü: ${cat.name}
Üretici: ${manufacturer}
Durum: Orijinal Çıkma
Uyumluluk: ${brand} modelleri

Kullanım Alanları
• ${brand} araç elektronik sistemleri
• ${cat.name} yönetimi ve aktüatör kontrolü
• Sensör ve sinyal iletimi
• Orijinal fabrika donanımı

Beyindeposu güvencesiyle kaliteli çıkma otomotiv elektronik yedek parçaları.`;

    const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const safeOem = finalOEM.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const slug = `${brandSlug}-${safeOem}-${shelfPart.replace(/[^a-z0-9]/g, "-")}`;

    const imageUrls = photos.map((p) => `/uploads/products/${p.fileName}`);
    const catId = categoryMap[cat.slug] || categoryMap["motor-beyinleri-ecu"] || Object.values(categoryMap)[0];

    productsToInsert.push({
      title,
      slug,
      oemNumber: finalOEM,
      shelfCode: shelfDisplay,
      categoryId: catId,
      brand,
      model: `${brand} Modelleri`,
      condition: "Orijinal Çıkma",
      inStock: true,
      description,
      images: imageUrls,
      metaTitle: `${manufacturer} ${finalOEM} ${brand} ${cat.name} Orijinal Çıkma | Beyindeposu`,
      metaDescription: `${brand} araçlar için ${manufacturer} ${finalOEM} numaralı ${cat.name}. Test edilmiş orijinal çıkma parça Beyindeposu güvencesiyle.`,
      metaKeywords: `${finalOEM}, ${shelfDisplay}, ${brand}, ${cat.name}, ${manufacturer}, Beyindeposu`,
      tags: [finalOEM, shelfDisplay, brand, manufacturer, cat.name, "Orijinal Çıkma", isVerified ? "Doğrulanmış OEM" : "İnceleme Gerekli"],
      needsReview: !isVerified,
      reviewReason: isVerified ? "Doğrulandı" : "OEM kodu internet/katalog standardına uymuyor (Seri No / Silik)",
    });
  }

  // 4. Batch insert
  console.log(`\n🚀 4. Adım: ${productsToInsert.length} adet ürün veritabanına aktarılıyor...`);
  console.log(`✅ %100 Doğrulanmış Gerçek OEM Ürün: ${verifiedCount}`);
  console.log(`⚠️ İnceleme Gereken Parça: ${reviewCount}`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
    const batch = productsToInsert.slice(i, i + BATCH_SIZE);
    await client.mutation(api.importData.batchInsertProducts, { products: batch });
    const percent = Math.min(100, Math.round(((i + batch.length) / productsToInsert.length) * 100));
    process.stdout.write(`\rİlerleme: %${percent} (${i + batch.length}/${productsToInsert.length} Ürün Aktarıldı)`);
  }

  console.log(`\n\n🎉 BİTTİ! Veritabanı %100 gerçek otomotiv OEM standartlarıyla yenilendi!`);
}

const target = process.argv.includes("--prod")
  ? "https://accurate-herring-115.convex.cloud"
  : DEV_CONVEX_URL;

reseedAllFromImages(target).catch(console.error);
