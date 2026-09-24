const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DEV_CONVEX_URL = "https://aromatic-elk-297.convex.cloud";
const ZIP_PATH = "C:\\Users\\volkan\\Desktop\\data.zip";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

async function testLocalImport() {
  console.log("🧪 LOKAL TEST BAŞLATILIYOR...");
  console.log(`📁 Hedef Görsel Klasörü: ${UPLOAD_DIR}`);

  // Create public/uploads/products directory
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const client = new ConvexHttpClient(DEV_CONVEX_URL);

  // 1. Initialize categories in dev
  console.log("\n⚙️ 1. Adım: Lokal Veritabanında Kategoriler hazırlanıyor...");
  const categoryMap = await client.mutation(api.importData.initCategories, {});
  console.log("✅ Kategoriler hazır.");

  // 2. Select 25 test products from data.zip
  console.log("\n📦 2. Adım: Test için 25 adet ürün seçiliyor ve görselleri çıkartılıyor...");

  // PowerShell script to extract 25 products with all their photos and clean filenames
  const psScript = `
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead('${ZIP_PATH.replace(/\\/g, "\\\\")}')
  $dest = '${UPLOAD_DIR.replace(/\\/g, "\\\\")}'

  $productGroups = @{}
  $entries = $zip.Entries | Where-Object { $_.Name -match '\\.(jpg|jpeg|png)$' }

  foreach ($entry in $entries) {
      $fileName = $entry.Name
      $nameWithoutExt = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
      $cleanCode = $nameWithoutExt -replace '_resized$', '' -replace '\\.[0-9]+[a-z]?$', ''
      $cleanCode = $cleanCode.Trim()
      
      if (-not $cleanCode) { continue }

      # Pick first 25 distinct products across ECU, ABS, Sigorta, KM Saatleri
      if (-not $productGroups.ContainsKey($cleanCode)) {
          if ($productGroups.Count -ge 25) {
              continue
          }
          $productGroups[$cleanCode] = [System.Collections.Generic.List[object]]::new()
      }
      
      if ($productGroups.ContainsKey($cleanCode)) {
          $productGroups[$cleanCode].Add($entry)
      }
  }

  $extractedInfo = [System.Collections.Generic.List[object]]::new()

  foreach ($code in $productGroups.Keys) {
      $entriesForProduct = $productGroups[$code]
      $extractedUrls = [System.Collections.Generic.List[string]]::new()
      $categoryPath = ""

      $idx = 1
      foreach ($entry in $entriesForProduct) {
          $categoryPath = $entry.FullName
          # Clean sanitized file name: e.g. 201-01-0347-1.jpg
          $safeCode = $code.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-'
          $newFileName = "$safeCode-$idx.jpg"
          $outPath = Join-Path $dest $newFileName

          [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $outPath, $true)
          $extractedUrls.Add("/uploads/products/$newFileName")
          $idx++
      }

      $itemObj = [PSCustomObject]@{
          Code = $code
          CategoryPath = $categoryPath
          Images = $extractedUrls
      }
      $extractedInfo.Add($itemObj)
  }

  $zip.Dispose()
  $extractedInfo | ConvertTo-Json -Depth 5 | Out-File -FilePath 'temp_extracted_test.json' -Encoding utf8
  `;

  fs.writeFileSync("temp_extract_test.ps1", psScript);
  execSync("powershell -ExecutionPolicy Bypass -File temp_extract_test.ps1");
  try { fs.unlinkSync("temp_extract_test.ps1"); } catch (e) { }

  const rawJson = fs.readFileSync("temp_extracted_test.json", "utf8").replace(/^\uFEFF/, "");
  const extractedData = JSON.parse(rawJson);
  try { fs.unlinkSync("temp_extracted_test.json"); } catch (e) { }

  console.log(`✅ ${extractedData.length} adet test ürününün tüm fotoğrafları temiz isimlerle 'public/uploads/products/' içine çıkartıldı.`);

  function detectBrand(folderStr) {
    const s = (folderStr || "").toLowerCase();
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
    const s = (folderStr || "").toLowerCase();
    if (s.includes("ecu setler"))
      return { name: "ECU Motor Beyin Setleri", slug: "ecu-motor-beyin-setleri" };
    if (s.includes("/ecu/") || s.includes("data/ecu") || s.includes("ecu"))
      return { name: "Motor Beyinleri (ECU)", slug: "motor-beyinleri-ecu" };
    if (s.includes("/abs/") || s.includes("data/abs") || s.includes("abs"))
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

  // 3. Build product objects
  const payload = extractedData.map((item) => {
    const category = detectCategory(item.CategoryPath);
    const brand = detectBrand(item.CategoryPath);
    const catId = categoryMap[category.slug] || Object.values(categoryMap)[0];

    const safeCode = item.Code.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const slug = `${brandSlug}-${safeCode}-${category.slug}`;

    const title = `${brand} ${category.name} (Stok Kodu: ${item.Code}) Orijinal Çıkma`;
    const description = `${brand} araç grubu ile uyumlu ${category.name}. Parça / Stok Kodu: ${item.Code}. Test edilmiş, çalışır durumda garantili orijinal çıkma oto elektronik parçadır. Aynı gün kargo imkanı ve birebir uyum desteği mevcuttur.`;

    return {
      title,
      slug,
      oemNumber: item.Code,
      shelfCode: item.Code,
      categoryId: catId,
      brand,
      condition: "Orijinal Çıkma",
      inStock: true,
      description,
      images: Array.isArray(item.Images) ? item.Images : [item.Images],
      metaTitle: `${title} | Beyindeposu`,
      metaDescription: description,
      metaKeywords: `${item.Code}, ${brand}, ${category.name}, oto beyin, çıkma parça, oto elektronik`,
      tags: [brand, category.name, item.Code, "Orijinal Çıkma"],
    };
  });

  // 4. Insert into Local Dev Convex
  console.log("\n🚀 3. Adım: Test ürünleri Lokal Dev Convex veritabanına ekleniyor...");
  const res = await client.mutation(api.importData.batchInsertProducts, {
    products: payload,
  });

  console.log(`\n🎉 LOKAL TEST BAŞARILI!`);
  console.log(`✅ Eklenen Test Ürünü: ${res.inserted}`);
  console.log(`✅ Çıkartılan Görsel Sayısı: ${fs.readdirSync(UPLOAD_DIR).length}`);
  console.log(`\n👉 Şimdi tarayıcınızda 'http://localhost:3000/urunler' sayfasına giderek ürünleri ve görselleri inceleyebilirsiniz!`);
}

testLocalImport().catch((e) => console.error("TEST HATA:", e));
