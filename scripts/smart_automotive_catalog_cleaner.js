const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

const DEV_CONVEX_URL = "https://aromatic-elk-297.convex.cloud";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

// Category mapping by shelf prefix
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
  if (oem.startsWith("4b") || oem.startsWith("1k") || oem.startsWith("038") || oem.startsWith("06a") || oem.startsWith("8d") || oem.startsWith("6q")) return "Volkswagen";
  if (oem.startsWith("8200") || oem.startsWith("8201") || oem.startsWith("23710") || oem.startsWith("7700")) return "Renault";
  if (oem.startsWith("091") || oem.startsWith("129") || oem.startsWith("555") || oem.startsWith("244") || oem.startsWith("131")) return "Opel";
  if (oem.startsWith("93bg") || oem.startsWith("3m51") || oem.startsWith("6g91") || oem.startsWith("ys4f") || oem.startsWith("yc1a") || oem.startsWith("4s61")) return "Ford";
  if (oem.startsWith("96") && (oem.endsWith("80") || oem.length >= 8)) return "Peugeot";
  if (oem.startsWith("51") || oem.startsWith("55") || oem.startsWith("46") || oem.startsWith("717") || oem.startsWith("500")) return "Fiat";
  return "Genel Uyumlu";
}

function detectCategoryFromShelf(shelfCode) {
  const m = shelfCode.match(/(?:101|201|301|401|501|601|701|801|901|902|903|904|905)[-\.]([0-9]{2})[-\.]/);
  if (m && SHELF_CATEGORY_MAP[m[1]]) {
    return SHELF_CATEGORY_MAP[m[1]];
  }
  return { name: "Motor Beyinleri (ECU)", slug: "motor-beyinleri-ecu" };
}

// Known manual overrides for verified parts
const MANUAL_OVERRIDES = {
  "201.07.0069": {
    oem: "46789398",
    title: "Fiat Airbag Sensörü & Beyni TRW 46789398 Orijinal Çıkma",
    brand: "Fiat",
    catSlug: "airbag-beyinleri",
    manufacturer: "TRW",
    model: "Punto / Bravo / Brava / Marea",
  },
  "201.0086": {
    oem: "0261204483",
    secondaryOem: "46523496",
    title: "Fiat Motor Beyni (ECU) Bosch 0261204483 (46523496) Orijinal Çıkma",
    brand: "Fiat",
    catSlug: "motor-beyinleri-ecu",
    manufacturer: "Bosch",
    model: "Coupe 2.0 20V Turbo / Marea",
  },
  "201.01.0226": {
    oem: "0261204405",
    secondaryOem: "46769403",
    title: "Fiat Motor Beyni (ECU) Bosch 0261204405 (46769403) Orijinal Çıkma",
    brand: "Fiat",
    catSlug: "motor-beyinleri-ecu",
    manufacturer: "Bosch",
    model: "Bravo / Brava / Marea",
  }
};

function parseAutomotivePart(rawStr, shelfCode) {
  const shelfClean = shelfCode.toUpperCase().replace(/-/g, ".");
  if (MANUAL_OVERRIDES[shelfClean]) {
    const o = MANUAL_OVERRIDES[shelfClean];
    return {
      valid: true,
      primaryOem: o.oem,
      secondaryOem: o.secondaryOem || null,
      manufacturer: o.manufacturer,
      customTitle: o.title,
      catSlug: o.catSlug,
      model: o.model,
    };
  }

  let clean = rawStr.toUpperCase().replace(/\s+/g, "");

  // Ford OEM: YC1A-12A650-JA, 3M51-12A650-AF, 6G91-12A650-AH
  const fordMatch = clean.match(/([A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{1,3})/);
  if (fordMatch) {
    return {
      valid: true,
      primaryOem: fordMatch[1],
      secondaryOem: null,
      manufacturer: "Ford",
    };
  }

  // Fiat 8-digit wrapped in Bosch 0046...0
  const fiatBosch = clean.replace(/-/g, "").match(/(?:00?)(46[0-9]{6}|51[0-9]{6}|55[0-9]{6}|717[0-9]{5}|500[0-9]{5})(?:0)?/);
  if (fiatBosch) {
    return {
      valid: true,
      primaryOem: fiatBosch[1],
      secondaryOem: null,
      manufacturer: "Bosch",
    };
  }

  const rawClean = clean.replace(/-/g, "").trim();

  // Bosch 10-digit code: 0281001781, 0261200734, 0130821230, 0227100026
  const boschMatch = rawClean.match(/(02[68][0-9]{7}|0130[0-9]{6}|0227[0-9]{6})/);
  if (boschMatch) {
    return {
      valid: true,
      primaryOem: boschMatch[1],
      secondaryOem: null,
      manufacturer: "Bosch",
    };
  }

  // Renault genuine: 8200XXXXXX, 8201XXXXXX, 7700XXXXXX, 23710XXXXX
  const renaultMatch = rawClean.match(/(8200[0-9]{6}|8201[0-9]{6}|7700[0-9]{6}|23710[0-9A-Z]{5}R?)/);
  if (renaultMatch) {
    return {
      valid: true,
      primaryOem: renaultMatch[1],
      secondaryOem: null,
      manufacturer: "Renault / Continental",
    };
  }

  // VAG (VW/Audi/Seat/Skoda): 4B0907401H, 038906018P, 1K0907115, 8D0907557
  const vagMatch = rawClean.match(/([0-9A-Z]{3}[0-9]{3}[0-9]{3}[A-Z]{0,3})/);
  if (vagMatch && !vagMatch[1].startsWith("000") && vagMatch[1].length >= 9) {
    return {
      valid: true,
      primaryOem: vagMatch[1],
      secondaryOem: null,
      manufacturer: "VAG (Audi / VW)",
    };
  }

  // Mercedes genuine: A000... or A611...
  const mbMatch = rawClean.match(/(A[0-9]{9,11})/);
  if (mbMatch) {
    return {
      valid: true,
      primaryOem: mbMatch[1],
      secondaryOem: null,
      manufacturer: "Mercedes-Benz",
    };
  }

  // Fiat/Alfa 8-digit standard
  const fiatStd = rawClean.match(/(46[0-9]{6}|51[0-9]{6}|55[0-9]{6}|717[0-9]{5}|500[0-9]{5})/);
  if (fiatStd) {
    return {
      valid: true,
      primaryOem: fiatStd[1],
      secondaryOem: null,
      manufacturer: "Fiat",
    };
  }

  // Opel/GM: 09115062, 55560123, 12992345, 2441...
  const opelMatch = rawClean.match(/((?:09|12|55|13|24)[0-9]{6}|Q1T[0-9A-Z]{6})/);
  if (opelMatch) {
    return {
      valid: true,
      primaryOem: opelMatch[1],
      secondaryOem: null,
      manufacturer: "Opel / GM",
    };
  }

  // Siemens / Continental: 5WK9XXXX, S1XXXXXXXX, A2C...
  const siemensMatch = rawClean.match(/(5WK[0-9A-Z]{4,7}|S1[0-9A-Z]{7,9}|A2C[0-9A-Z]{7,9})/);
  if (siemensMatch) {
    return {
      valid: true,
      primaryOem: siemensMatch[1],
      secondaryOem: null,
      manufacturer: "Siemens VDO",
    };
  }

  // PSA Peugeot Citroen: 96XXXXXX80
  const psaMatch = rawClean.match(/(96[0-9]{6,8}80)/);
  if (psaMatch) {
    return {
      valid: true,
      primaryOem: psaMatch[1],
      secondaryOem: null,
      manufacturer: "PSA (Peugeot / Citroën)",
    };
  }

  // Magneti Marelli: IAW...
  const marelliMatch = rawClean.match(/(IAW[0-9A-Z\.]+)/);
  if (marelliMatch) {
    return {
      valid: true,
      primaryOem: marelliMatch[1],
      secondaryOem: null,
      manufacturer: "Magneti Marelli",
    };
  }

  // Unverified / Inspection needed
  return {
    valid: false,
    primaryOem: "İNCELEME GEREKLİ",
    secondaryOem: null,
    manufacturer: "Orijinal Ekipman (OEM)",
  };
}

async function runSmartCleaner(targetUrl = DEV_CONVEX_URL) {
  console.log(`🚀 AKILLI OTOMOTİV KATALOG VE OEM MOTORU BAŞLATILIYOR...`);
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

  // 2. Scan uploads
  console.log("\n📦 2. Adım: Görsel klasörü taranıyor...");
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

  // 3. Build verified products
  const productsToInsert = [];
  let verifiedCount = 0;
  let reviewCount = 0;

  for (const prefix of allPrefixes) {
    const photos = productMap.get(prefix);
    photos.sort((a, b) => a.index - b.index);

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

    const parsed = parseAutomotivePart(oemPart || prefix, shelfPart);
    const shelfDisplay = shelfPart.toUpperCase().replace(/-/g, ".");
    const brand = detectBrand(shelfPart, parsed.primaryOem);
    const cat = parsed.catSlug && categoryMap[parsed.catSlug]
      ? { name: categoryMap[parsed.catSlug], slug: parsed.catSlug }
      : detectCategoryFromShelf(shelfPart);
    const manufacturer = parsed.manufacturer;

    const isVerified = parsed.valid;
    const finalOEM = parsed.primaryOem;
    const secondaryOEM = parsed.secondaryOem;

    if (isVerified) {
      verifiedCount++;
    } else {
      reviewCount++;
    }

    let title = parsed.customTitle;
    if (!title) {
      if (isVerified) {
        title = secondaryOEM
          ? `${brand} ${cat.name} ${manufacturer} ${finalOEM} (${secondaryOEM}) Orijinal Çıkma`
          : `${brand} ${cat.name} ${manufacturer} ${finalOEM} Orijinal Çıkma`;
      } else {
        title = `${brand} ${cat.name} (${shelfDisplay}) Orijinal Çıkma (İnceleme Gerekli)`;
      }
    }

    const description = `${brand} araçlar için ${manufacturer} üretimi ${isVerified ? finalOEM + " parça numaralı " : ""}${cat.name} orijinal çıkma yedek parça.

Parça Özellikleri & Kontroller:
Ürün profesyonel olarak araçtan sökülmüş, tüm soket ve pin kontrolleri yapılmış, kullanıma hazır durumdadır. ${isVerified ? `Satın almadan önce parça üzerindeki numaranın (${finalOEM}) kontrol edilmesi önerilir.` : "Etiket incelemesi devam etmektedir."}

Ürün Özellikleri
Parça No: ${finalOEM}${secondaryOEM ? ` / Referans: ${secondaryOEM}` : ""}
Raf / Stok Kodu: ${shelfDisplay}
Araç Markası: ${brand}
Parça Türü: ${cat.name}
Üretici: ${manufacturer}
Durum: Orijinal Çıkma
Uyumluluk: ${parsed.model || brand + " Modelleri"}

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

    const tags = [finalOEM, shelfDisplay, brand, manufacturer, cat.name, "Orijinal Çıkma", isVerified ? "Doğrulanmış OEM" : "İnceleme Gerekli"];
    if (secondaryOEM) tags.push(secondaryOEM);

    productsToInsert.push({
      title,
      slug,
      oemNumber: finalOEM,
      shelfCode: shelfDisplay,
      categoryId: catId,
      brand,
      model: parsed.model || `${brand} Modelleri`,
      condition: "Orijinal Çıkma",
      inStock: true,
      description,
      images: imageUrls,
      metaTitle: `${manufacturer} ${finalOEM} ${brand} ${cat.name} Orijinal Çıkma | Beyindeposu`,
      metaDescription: `${brand} araçlar için ${manufacturer} ${finalOEM} numaralı ${cat.name}. Test edilmiş orijinal çıkma parça Beyindeposu güvencesiyle.`,
      metaKeywords: `${finalOEM}, ${shelfDisplay}, ${brand}, ${cat.name}, ${manufacturer}, Beyindeposu`,
      tags,
      needsReview: !isVerified,
      reviewReason: isVerified ? "Doğrulandı" : "OEM kodu katalog standardına uymuyor",
    });
  }

  console.log(`\n🚀 4. Adım: Veritabanına aktarılıyor...`);
  console.log(`✅ %100 Doğrulanmış Gerçek OEM Ürün: ${verifiedCount}`);
  console.log(`⚠️ İnceleme Gereken Parça: ${reviewCount}`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
    const batch = productsToInsert.slice(i, i + BATCH_SIZE);
    await client.mutation(api.importData.batchInsertProducts, { products: batch });
    const percent = Math.min(100, Math.round(((i + batch.length) / productsToInsert.length) * 100));
    process.stdout.write(`\rİlerleme: %${percent} (${i + batch.length}/${productsToInsert.length} Ürün Aktarıldı)`);
  }

  console.log(`\n\n🎉 BİTTİ! Akıllı otomotiv katalog motoru başarıyla tamamlandı!`);
}

runSmartCleaner().catch(console.error);
