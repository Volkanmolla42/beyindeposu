const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROD_CONVEX_URL = "https://accurate-herring-115.convex.cloud";
const ZIP_PATH = "C:\\Users\\volkan\\Desktop\\data.zip";

// Category details dictionary
const CATEGORY_SPECS = {
  "motor-beyinleri-ecu": {
    name: "Motor Beyinleri (ECU)",
    unitType: "Motor Kontrol Ünitesi",
    electronicUnitName: "Engine Control Unit (ECU)",
    functionText: "aracın yakıt enjeksiyonu, ateşleme zamanlaması, turbo basınç yönetimi ve motor çalışma parametrelerini yöneten ana elektronik kontrol parçasıdır",
    usageAreas: (b) => [
      `${b} motor kontrol ve ateşleme sistemleri`,
      "Yakıt enjeksiyon ve püskürtme yönetimi",
      "Turbo ve hava akış sensör kontrolü",
      "Motor elektronik yönetim sistemleri",
    ],
  },
  "abs-esp-beyinleri": {
    name: "ABS / ESP Beyinleri",
    unitType: "Elektronik Fren Kontrol Bloğu",
    electronicUnitName: "Anti-lock Braking & Stability System (ABS/ESP)",
    functionText: "tekerlek devir sensörleri, hidrolik fren basınç regülasyonu ve savrulma önleme (ESP) fonksiyonlarını kontrol eden kritik bir elektronik fren ünitesidir",
    usageAreas: (b) => [
      `${b} ABS hidrolik fren kontrol sistemleri`,
      "ESP savrulma ve dinamik denge yönetimi",
      "Fren basınç regülasyonu ve tekerlek hız kontrolü",
      "Fren elektronik ve sensör sistemleri",
    ],
  },
  "gosterge-panelleri": {
    name: "Gösterge Panelleri",
    unitType: "KM Saati ve Gösterge Paneli",
    electronicUnitName: "Instrument Cluster & Dashboard Unit",
    functionText: "hız, devir, yakıt seviyesi, hararet göstergeleri ve araç ikaz/bilgi ekranı fonksiyonlarını yöneten ana gösterge ünitesidir",
    usageAreas: (b) => [
      `${b} dijital ve analog gösterge sistemleri`,
      "KM saati ve hız bilgi yönetimi",
      "Motor ikaz ve servis uyarı ekranı",
      "CAN-Bus araç içi bilgi haberleşmesi",
    ],
  },
  "sigorta-kutulari": {
    name: "Sigorta Kutuları",
    unitType: "Sigorta ve Güç Dağıtım Kutusu",
    electronicUnitName: "Fuse Box & Power Distribution Module",
    functionText: "motor içi ve gövde elektrik hatlarının güç dağıtımını, röle kontrollerini ve sigorta koruma devrelerini yöneten elektrik merkezidir",
    usageAreas: (b) => [
      `${b} ana güç dağıtım hatları`,
      "Röle ve elektrik devre kontrolü",
      "Kısa devre ve aşırı akım sigorta koruması",
      "Motor & gövde elektrik tesisat yönetimi",
    ],
  },
  "bcm-bsi-sam-modulleri": {
    name: "BCM / BSI Modülleri",
    unitType: "Gövde Kontrol Modülü (BCM/BSI)",
    electronicUnitName: "Body Control Module (BCM / BSI / SAM)",
    functionText: "merkezi kilit, iç/dış aydınlatma, silecekler, cam kontrolleri ve immobilizer haberleşmesini yöneten ana gövde kontrol ünitesidir",
    usageAreas: (b) => [
      `${b} merkezi kilit ve güvenlik sistemleri`,
      "İç ve dış aydınlatma yönetimi",
      "Silecek ve cam konfor modülü kontrolleri",
      "Gövde elektronik yönetim sistemleri",
    ],
  },
  "airbag-beyinleri": {
    name: "Airbag Beyinleri",
    unitType: "Hava Yastığı Kontrol Modülü",
    electronicUnitName: "Airbag & SRS Control Module",
    functionText: "çarpışma ve ivme sensörlerini analiz ederek hava yastıkları ve emniyet kemeri gergilerini milisaniyeler içinde yöneten kritik güvenlik ünitesidir",
    usageAreas: (b) => [
      `${b} hava yastığı (SRS Airbag) sistemleri`,
      "İvme ve darbe sensör yönetimi",
      "Emniyet kemeri ön gergi kontrolü",
      "Pasif güvenlik elektronik sistemleri",
    ],
  },
  "kumanda-panel-ve-dugmeler": {
    name: "Kumanda Panel ve Düğmeler",
    unitType: "Kumanda Paneli ve Kontrol Butonları",
    electronicUnitName: "Control Switch Panel & Switch Module",
    functionText: "cam açma/kapama, ayna ayar, klima kontrol ve kabin içi elektronik donanımların yönetimini sağlayan kontrol panelidir",
    usageAreas: (b) => [
      `${b} cam açma ve kapama kontrol sistemleri`,
      "Elektrikli ayna ayar yönetimi",
      "Kabin içi kumanda buton kontrolleri",
      "Konfor elektronik sistemleri",
    ],
  },
  "direksiyon-kumanda-modulleri": {
    name: "Direksiyon & Sinyal Kolları",
    unitType: "Direksiyon Sinyal ve Silecek Kolu",
    electronicUnitName: "Steering Column Switch & Lever Module",
    functionText: "sinyal, far, silecek, hız sabitleyici ve direksiyon açı sensörü fonksiyonlarını yöneten direksiyon kolon modülüdür",
    usageAreas: (b) => [
      `${b} sinyal ve far aydınlatma kontrolü`,
      "Ön/arka silecek ve yıkama yönetimi",
      "Direksiyon açı sensörü (SAS) haberleşmesi",
      "Direksiyon kumanda sistemleri",
    ],
  },
  "konfor-modulleri": {
    name: "Kontak & Çalıştırma Sistemleri",
    unitType: "Kontak ve Çalıştırma Modülü",
    electronicUnitName: "Ignition & Keyless Start System",
    functionText: "anahtar okuyucu, immobilizer güvenliği, direksiyon kilidi ve start-stop başlatma devrelerini yöneten kontak kontrol ünitesidir",
    usageAreas: (b) => [
      `${b} kontak ve çalıştırma sistemleri`,
      "İmmobilizer anahtar tanıma yönetimi",
      "Elektronik direksiyon kilidi (ELV) kontrolü",
      "Start-Stop ateşleme sistemleri",
    ],
  },
  "multimedya-uniteleri": {
    name: "Multimedya Üniteleri",
    unitType: "Multimedya ve Radyo Ekran Ünitesi",
    electronicUnitName: "Infotainment & Navigation Head Unit",
    functionText: "orijinal radyo, bluetooth, ses sistemi, geri görüş kamerası ve araç menü ayarlarını kontrol eden multimedya ünitesidir",
    usageAreas: (b) => [
      `${b} orijinal radyo ve müzik sistemleri`,
      "Bluetooth & telefon bağlantı yönetimi",
      "Araç bilgi ve donanım menü kontrolleri",
      "Multimedya ekran sistemleri",
    ],
  },
  "cam-kapi-motorlari": {
    name: "Cam & Ayna Motorları",
    unitType: "Elektrikli Cam ve Kapı Motoru",
    electronicUnitName: "Power Window & Door Motor Unit",
    functionText: "otomatik cam krikosu, kapı kilidi veya katlanır ayna mekanizmalarını yöneten entegre elektronik motor ünitesidir",
    usageAreas: (b) => [
      `${b} elektrikli cam kaldırma mekanizmaları`,
      "Otomatik sıkışma önleyici sensör kontrolü",
      "Kapı & kilit elektronik yönetimi",
      "Gövde motorlu mekanizma sistemleri",
    ],
  },
  "ecu-motor-beyin-setleri": {
    name: "ECU Motor Beyin Setleri",
    unitType: "Motor Beyin ve İmmobilizer Seti",
    electronicUnitName: "Complete ECU & Immobilizer Kit",
    functionText: "motor beyni (ECU), kontak anahtarı, BSI gövde modülü ve immobilizer ünitesinin bir arada bulunduğu tam uyumlu çalıştırma setidir",
    usageAreas: (b) => [
      `${b} komple motor ve ateşleme sistemleri`,
      "Eşleştirilmiş ECU & BSI beyin yönetimi",
      "İmmobilizer ve anahtar seti çalıştırma",
      "Komple oto elektronik sistemleri",
    ],
  },
  "direksiyon-pompa": {
    name: "Direksiyon & Pompa",
    unitType: "Elektrikli Direksiyon Pompası ve Beyni",
    electronicUnitName: "Electric Power Steering (EPS) Pump & Module",
    functionText: "elektrik destekli hidrolik direksiyon pompası veya direksiyon kutusu tork sensörlerini yöneten elektronik güç ünitesidir",
    usageAreas: (b) => [
      `${b} elektrikli direksiyon destek sistemleri`,
      "Direksiyon hidrolik pompa motor kontrolü",
      "Hıza duyarlı direksiyon sertlik regülasyonu",
      "Direksiyon elektronik sistemleri",
    ],
  },
  "oto-elektronik-genel": {
    name: "Oto Elektronik Parçaları",
    unitType: "Oto Elektronik Parçası",
    electronicUnitName: "Automotive Electronic Component",
    functionText: "aracın ilgili elektronik donanım devrelerini ve sensör haberleşmesini sağlayan orijinal test edilmiş oto elektronik yedek parçadır",
    usageAreas: (b) => [
      `${b} elektronik tesisat ve kontrol hatları`,
      "Sensör ve aktüatör haberleşmesi",
      "Araç içi elektronik donanım yönetimi",
      "Oto elektronik yedek parça sistemleri",
    ],
  },
};

function detectBrand(folderStr) {
  const s = (folderStr || "").toLowerCase();
  if (s.includes("mercedes")) return "Mercedes-Benz";
  if (s.includes("bmw")) return "BMW";
  if (s.includes("audi")) return "Audi";
  if (s.includes("vw") || s.includes("volkswagen")) return "Volkswagen";
  if (s.includes("skoda")) return "Skoda";
  if (s.includes("seat")) return "Seat";
  if (s.includes("renault")) return "Renault";
  if (s.includes("fiat")) return "Fiat";
  if (s.includes("opel")) return "Opel";
  if (s.includes("peugeot")) return "Peugeot";
  if (s.includes("citroen")) return "Citroën";
  if (s.includes("ford")) return "Ford";
  if (s.includes("hyundai")) return "Hyundai";
  if (s.includes("kia")) return "Kia";
  if (s.includes("toyota")) return "Toyota";
  if (s.includes("honda")) return "Honda";
  if (s.includes("nissan")) return "Nissan";
  if (s.includes("volvo")) return "Volvo";
  if (s.includes("mitsubishi")) return "Mitsubishi";
  if (s.includes("mazda")) return "Mazda";
  if (s.includes("suzuki")) return "Suzuki";
  if (s.includes("chevrolet")) return "Chevrolet";
  return "Genel Uyumlu";
}

function detectCategorySlug(folderStr) {
  const s = (folderStr || "").toLowerCase();
  if (s.includes("ecu setler")) return "ecu-motor-beyin-setleri";
  if (s.includes("/ecu/") || s.includes("data/ecu") || s.includes("ecu")) return "motor-beyinleri-ecu";
  if (s.includes("/abs/") || s.includes("data/abs") || s.includes("abs")) return "abs-esp-beyinleri";
  if (s.includes("km saatleri") || s.includes("gosterge")) return "gosterge-panelleri";
  if (s.includes("sigorta")) return "sigorta-kutulari";
  if (s.includes("kumanda") || s.includes("panel ve du") || s.includes("düğme")) return "kumanda-panel-ve-dugmeler";
  if (s.includes("modül") || s.includes("modul")) return "bcm-bsi-sam-modulleri";
  if (s.includes("airbag")) return "airbag-beyinleri";
  if (s.includes("kollar")) return "direksiyon-kumanda-modulleri";
  if (s.includes("kontak") || s.includes("calistirma")) return "konfor-modulleri";
  if (s.includes("multimedya")) return "multimedya-uniteleri";
  if (s.includes("cam motor")) return "cam-kapi-motorlari";
  if (s.includes("direksiyon")) return "direksiyon-pompa";
  return "oto-elektronik-genel";
}

async function runCleanFilteredImport() {
  console.log("🧹 1. Adım: Canlı Veritabanı Temizleniyor...");

  const client = new ConvexHttpClient(PROD_CONVEX_URL);

  // Batch delete all old products
  let totalDeleted = 0;
  let hasMore = true;
  while (hasMore) {
    const delRes = await client.mutation(api.importData.cleanProductsBatch, { limit: 500 });
    totalDeleted += delRes.deleted;
    hasMore = delRes.remaining;
    process.stdout.write(`\rTemizlenen eski kayıt: ${totalDeleted}...`);
  }
  console.log(`\n✅ Eski veriler temizlendi (${totalDeleted} adet).`);

  const initRes = await client.mutation(api.importData.initCategoriesAndBrands, {});
  const categoryMap = initRes.categoryMap;
  console.log("✅ Kategoriler ve Markalar hazırlandı.");

  // 2. Read and filter real auto parts
  console.log("\n📦 2. Adım: data.zip okunuyor ve logo/ikon dosyaları eleniyor...");
  const psScript = `
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead('${ZIP_PATH.replace(/\\/g, "\\\\")}')
  $list = [System.Collections.Generic.List[string]]::new()
  foreach ($entry in $zip.Entries) {
      if ($entry.Name -match '\\.(jpg|jpeg|png)$') {
          $name = $entry.Name.ToLower()
          # Filter out banner, icon, cd_ logos
          if ($name -notmatch '^(cd_|banner|logo|icon|button|thumb|header|bg|slider|empty|resim|adsiz)') {
              $list.Add($entry.FullName)
          }
      }
  }
  $list | Out-File -FilePath 'temp_filtered_files.txt' -Encoding utf8
  $zip.Dispose()
  `;

  fs.writeFileSync("temp_filter.ps1", psScript);
  execSync("powershell -ExecutionPolicy Bypass -File temp_filter.ps1");
  try { fs.unlinkSync("temp_filter.ps1"); } catch (e) { }

  const rawLines = fs
    .readFileSync("temp_filtered_files.txt", "utf8")
    .replace(/^\uFEFF/, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  try { fs.unlinkSync("temp_filtered_files.txt"); } catch (e) { }

  console.log(`✅ Toplam ${rawLines.length} gerçek ürün görseli ayrıştırıldı.`);

  const productsMap = new Map();

  for (const rawPath of rawLines) {
    const fileName = path.basename(rawPath);
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);

    const cleanCode = nameWithoutExt
      .replace(/_resized$/i, "")
      .replace(/\.[0-9]+[a-z]?$/i, "")
      .trim();

    if (!cleanCode || cleanCode.startsWith("cd_") || cleanCode.length < 3) continue;

    const safeCode = cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    if (!productsMap.has(cleanCode)) {
      productsMap.set(cleanCode, {
        code: cleanCode,
        safeCode,
        categoryPath: rawPath,
        images: [],
      });
    }

    const item = productsMap.get(cleanCode);
    const imgIndex = item.images.length + 1;
    item.images.push(`/uploads/products/${safeCode}-${imgIndex}.jpg`);
  }

  const allProducts = Array.from(productsMap.values());
  console.log(`📦 Toplam ${allProducts.length} adet geçerli ürün hazırlandı.`);

  // 3. Batch insert to Convex
  console.log(`\n🚀 3. Adım: ${allProducts.length} adet ürün canlı veritabanına aktarılıyor...`);

  const BATCH_SIZE = 60;
  let totalInserted = 0;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);

    const payload = batch.map((item) => {
      const catSlug = detectCategorySlug(item.categoryPath);
      const catSpec = CATEGORY_SPECS[catSlug] || CATEGORY_SPECS["oto-elektronik-genel"];
      const brand = detectBrand(item.categoryPath);
      const catId = categoryMap[catSlug] || Object.values(categoryMap)[0];

      const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const slug = `${brandSlug}-${item.safeCode}-${catSlug}`;

      const title = `${brand} ${catSpec.name} ${item.code} Orijinal Çıkma ${catSpec.unitType}`;
      const areas = catSpec.usageAreas(brand);

      const description = `${brand} araçlar için ${item.code} referans/stok numaralı ${catSpec.name} (${catSpec.electronicUnitName}) orijinal çıkma yedek parça.

${catSpec.unitType}; ${catSpec.functionText}.

Ürün profesyonel olarak sökülmüş, kontrol edilmiş ve kullanıma hazır durumdadır. Satın almadan önce parça ve soket yapısının (${item.code}) kontrol edilmesi ve karşılaştırılması önerilir.

Ürün Özellikleri
Parça / Stok No: ${item.code}
Araç Markası: ${brand}
Parça Türü: ${catSpec.name}
Elektronik Kontrol Ünitesi: ${catSpec.electronicUnitName}
Durum: Orijinal Çıkma
Uyumluluk: ${brand} uyumlu modeller (parça ve soket yapısı kontrol edilerek)

Kullanım Alanları
${areas[0]}
${areas[1]}
${areas[2]}
${areas[3]}

Beyindeposu güvencesiyle kaliteli çıkma otomotiv elektronik yedek parçaları.`;

      const metaTitle = `${item.code} ${brand} ${catSpec.name} Orijinal Çıkma | Beyindeposu`;
      const metaDescription = `${brand} araçlar için ${item.code} numaralı ${catSpec.name}. Test edilmiş orijinal çıkma parça ve otomotiv elektronik ürünleri Beyindeposu güvencesiyle.`;
      const metaKeywords = `${item.code}, ${brand} ${catSpec.name}, ${brand} çıkma parça, ${catSpec.unitType}, oto beyin, otomotiv elektronik, Beyindeposu`;
      const tags = [item.code, brand, catSpec.name, catSpec.unitType, "Orijinal Çıkma", "Otomotiv Elektronik", "Beyindeposu"];

      return {
        title,
        slug,
        oemNumber: item.code,
        shelfCode: item.code,
        categoryId: catId,
        brand,
        condition: "Orijinal Çıkma",
        inStock: true,
        description,
        images: item.images,
        metaTitle,
        metaDescription,
        metaKeywords,
        tags,
      };
    });

    try {
      const res = await client.mutation(api.importData.batchInsertProducts, {
        products: payload,
      });
      totalInserted += res.inserted || 0;
    } catch (err) {
      console.error(`\nBatch ${i} hatası:`, err.message);
    }

    const currentCount = Math.min(i + BATCH_SIZE, allProducts.length);
    const percent = Math.round((currentCount / allProducts.length) * 100);
    process.stdout.write(
      `\rİlerleme: %${percent} (${currentCount}/${allProducts.length} - Aktarılan: ${totalInserted})`
    );
  }

  console.log(`\n\n🎉 BİTTİ! Toplam ${totalInserted} gerçek oto elektronik ürünü başarıyla aktarıldı!`);
}

runCleanFilteredImport().catch(console.error);
