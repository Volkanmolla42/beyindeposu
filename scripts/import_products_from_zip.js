const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CONVEX_URL = "https://accurate-herring-115.convex.cloud";
const ZIP_PATH = "C:\\Users\\volkan\\Desktop\\data.zip";

async function run() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("🚀 1. Adım: data.zip okunuyor...");
  const psScript = `
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead('${ZIP_PATH.replace(/\\/g, "\\\\")}')
  $list = [System.Collections.Generic.List[string]]::new()
  foreach ($entry in $zip.Entries) {
      if ($entry.Name -match '\\.(jpg|jpeg|png)$') {
          $list.Add($entry.FullName)
      }
  }
  $list | Out-File -FilePath 'temp_files_list.txt' -Encoding utf8
  $zip.Dispose()
  `;

  fs.writeFileSync("temp_read_zip.ps1", psScript);
  execSync("powershell -ExecutionPolicy Bypass -File temp_read_zip.ps1");
  try { fs.unlinkSync("temp_read_zip.ps1"); } catch (e) { }

  const rawLines = fs
    .readFileSync("temp_files_list.txt", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  try { fs.unlinkSync("temp_files_list.txt"); } catch (e) { }

  console.log(`✅ Toplam ${rawLines.length} görsel bulundu.`);

  function detectBrand(folderStr) {
    const s = folderStr.toLowerCase();
    if (s.includes("mercedes")) return "Mercedes-Benz";
    if (s.includes("bmw")) return "BMW";
    if (s.includes("vw") || s.includes("audi") || s.includes("volkswagen") || s.includes("seat") || s.includes("skoda"))
      return "Volkswagen / Audi";
    if (s.includes("renault")) return "Renault";
    if (s.includes("fiat") || s.includes("opel") || s.includes("chevrolet") || s.includes("saab"))
      return "Fiat / Opel";
    if (s.includes("peugeot") || s.includes("citroen")) return "Peugeot / Citroën";
    if (s.includes("ford")) return "Ford";
    if (s.includes("hyundai") || s.includes("kia")) return "Hyundai / Kia";
    if (s.includes("toyota")) return "Toyota";
    if (s.includes("honda")) return "Honda";
    if (s.includes("nissan")) return "Nissan";
    if (s.includes("volvo") || s.includes("jaguar") || s.includes("rover") || s.includes("land"))
      return "Volvo / Land Rover";
    if (s.includes("mitsubishi")) return "Mitsubishi";
    if (s.includes("mazda")) return "Mazda";
    if (s.includes("suzuki")) return "Suzuki";
    if (s.includes("amerikan")) return "Amerikan";
    return "Genel Uyumlu";
  }

  function detectCategory(folderStr) {
    const s = folderStr.toLowerCase();
    if (s.includes("ecu setler"))
      return { name: "ECU Motor Beyin Setleri", slug: "ecu-motor-beyin-setleri" };
    if (s.includes("/ecu/") || s.startsWith("data/ecu"))
      return { name: "Motor Beyinleri (ECU)", slug: "motor-beyinleri-ecu" };
    if (s.includes("/abs/") || s.startsWith("data/abs"))
      return { name: "ABS / ESP Beyinleri", slug: "abs-esp-beyinleri" };
    if (s.includes("km saatleri") || s.includes("gosterge"))
      return { name: "Gösterge Panelleri", slug: "gosterge-panelleri" };
    if (s.includes("sigorta"))
      return { name: "Sigorta Kutuları", slug: "sigorta-kutulari" };
    if (s.includes("kumanda") || s.includes("panel ve du") || s.includes("düğme"))
      return { name: "Kumanda Panel ve Düğmeler", slug: "kumanda-panel-ve-dugmeler" };
    if (s.includes("modül") || s.includes("modul"))
      return { name: "BCM / BSI Modülleri", slug: "bcm-bsi-sam-modulleri" };
    if (s.includes("airbag"))
      return { name: "Airbag Beyinleri", slug: "airbag-beyinleri" };
    if (s.includes("kollar"))
      return { name: "Direksiyon & Sinyal Kolları", slug: "direksiyon-kumanda-modulleri" };
    if (s.includes("kontak") || s.includes("calistirma"))
      return { name: "Kontak & Çalıştırma Sistemleri", slug: "konfor-modulleri" };
    if (s.includes("multimedya"))
      return { name: "Multimedya Üniteleri", slug: "multimedya-uniteleri" };
    if (s.includes("cam motor"))
      return { name: "Cam & Ayna Motorları", slug: "cam-kapi-motorlari" };
    if (s.includes("direksiyon"))
      return { name: "Direksiyon & Pompa", slug: "direksiyon-pompa" };
    return { name: "Oto Elektronik Parçaları", slug: "oto-elektronik-genel" };
  }

  const productsMap = new Map();

  for (const rawPath of rawLines) {
    const fileName = path.basename(rawPath);
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);

    const cleanCode = nameWithoutExt
      .replace(/_resized$/i, "")
      .replace(/\.[0-9]+[a-z]?$/i, "")
      .trim();

    if (!cleanCode) continue;

    const category = detectCategory(rawPath);
    const brand = detectBrand(rawPath);
    const imageUrl = `/uploads/${rawPath.replace(/\\/g, "/")}`;

    if (!productsMap.has(cleanCode)) {
      productsMap.set(cleanCode, {
        oemNumber: cleanCode,
        shelfCode: cleanCode,
        brand,
        category,
        images: [imageUrl],
      });
    } else {
      const existing = productsMap.get(cleanCode);
      if (!existing.images.includes(imageUrl)) {
        existing.images.push(imageUrl);
      }
    }
  }

  const uniqueProducts = Array.from(productsMap.values());
  console.log(`📦 Toplam ${uniqueProducts.length} benzersiz ürün oluşturuldu.`);

  // 2. Step: Initialize Categories
  console.log("\n⚙️ 2. Adım: Kategoriler Convex üzerinde hazırlanıyor...");
  const categoryMap = await client.mutation(api.importData.initCategories, {});
  console.log("✅ Kategoriler hazır:", Object.keys(categoryMap).length, "kategori.");

  // 3. Step: Batch insert via HTTP client
  console.log(`\n🚀 3. Adım: ${uniqueProducts.length} ürün Convex'e aktarılıyor...`);

  const BATCH_SIZE = 50;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < uniqueProducts.length; i += BATCH_SIZE) {
    const batch = uniqueProducts.slice(i, i + BATCH_SIZE);

    const payload = batch.map((item) => {
      const catId = categoryMap[item.category.slug] || Object.values(categoryMap)[0];
      const brandSlug = item.brand
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      const oemSlug = item.oemNumber
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      const slug = `${brandSlug}-${oemSlug}-${item.category.slug}`;

      const title = `${item.brand} ${item.category.name} (${item.oemNumber}) Orijinal Çıkma`;
      const description = `${item.brand} uyumlu ${item.category.name}. Stok/OEM Kodu: ${item.oemNumber}. Test edilmiş, garantili orijinal çıkma oto elektronik parçadır. Aynı gün hızlı kargo ve parça uyum desteği mevcuttur.`;

      return {
        title,
        slug,
        oemNumber: item.oemNumber,
        shelfCode: item.shelfCode,
        categoryId: catId,
        brand: item.brand,
        condition: "Orijinal Çıkma",
        inStock: true,
        description,
        images: item.images,
        metaTitle: `${title} | Beyindeposu`,
        metaDescription: description,
        metaKeywords: `${item.oemNumber}, ${item.brand}, ${item.category.name}, oto beyin, çıkma parça, oto elektronik`,
        tags: [item.brand, item.category.name, item.oemNumber, "Orijinal Çıkma"],
      };
    });

    try {
      const result = await client.mutation(api.importData.batchInsertProducts, {
        products: payload,
      });
      totalInserted += result.inserted || 0;
      totalSkipped += result.skipped || 0;
    } catch (err) {
      console.error(`\nBatch ${i} hatası:`, err.message);
    }

    const currentCount = Math.min(i + BATCH_SIZE, uniqueProducts.length);
    const percent = Math.round((currentCount / uniqueProducts.length) * 100);
    process.stdout.write(
      `\rİlerleme: %${percent} (${currentCount}/${uniqueProducts.length} - Eklenen: ${totalInserted}, Atlanan: ${totalSkipped})`
    );
  }

  console.log(
    `\n\n🎉 BİTTİ! Toplam ${totalInserted} yeni ürün Convex veritabanına başarıyla aktarıldı!`
  );
}

run().catch((e) => console.error("FATAL ERROR:", e));
