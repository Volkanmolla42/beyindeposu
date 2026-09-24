const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://aromatic-elk-297.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

const CATEGORY_IMAGE_FILE_MAP = {
  "motor-beyinleri-ecu": "cat-ecu.jpg",
  "abs-esp-beyinleri": "cat-abs.jpg",
  "airbag-beyinleri": "cat-airbag.jpg",
  "bcm-bsi-sam-modulleri": "cat-bcm.jpg",
  "uch-sam-modulleri": "cat-uch.jpg",
  "sigorta-kutulari": "cat-fusebox.jpg",
  "gosterge-panelleri": "cat-cluster.jpg",
  "direksiyon-kumanda-modulleri": "cat-steering.jpg",
  "klima-kontrol-uniteleri": "cat-climate.jpg",
  "multimedya-uniteleri": "cat-multimedia.jpg",
  "konfor-modulleri": "cat-comfort.jpg",
  "sanziman-beyinleri": "cat-transmission.jpg",
  "kumanda-panel-ve-dugmeler": "cat-switches.jpg",
  "cam-kapi-motorlari": "cat-window-motor.jpg",
  "ecu-motor-beyin-setleri": "cat-ecu-kit.jpg",
  "direksiyon-pompa": "cat-steering-pump.jpg",
  "oto-elektronik-genel": "cat-electronics.jpg",
};

async function uploadFileToConvex(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const postUrl = await client.mutation(api.files.generateUploadUrl, {});
  
  const response = await fetch(postUrl, {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const { storageId } = await response.json();
  return storageId;
}

async function main() {
  console.log("=== Kategori Görsellerini Convex Storage'a Taşıma Başlatılıyor ===");
  console.log(`Convex URL: ${CONVEX_URL}`);

  // Fetch all categories
  const categories = await client.query(api.categories.list, { onlyActive: false });
  console.log(`Veritabanında ${categories.length} adet kategori bulundu.`);

  const updates = [];

  for (const cat of categories) {
    const filename = CATEGORY_IMAGE_FILE_MAP[cat.slug];
    if (!filename) {
      console.warn(`[UYARI] '${cat.slug}' için eşleşen yerel görsel dosyası bulunamadı, atlanıyor.`);
      continue;
    }

    const localPath = path.join(process.cwd(), "public", "images", filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`[UYARI] '${localPath}' dosyası diskte bulunamadı, atlanıyor.`);
      continue;
    }

    console.log(`Yükleniyor: ${cat.name} (${cat.slug}) -> ${filename}...`);
    try {
      const storageId = await uploadFileToConvex(localPath);
      console.log(`  -> Başarılı! Storage ID: ${storageId}`);
      updates.push({
        slug: cat.slug,
        storageId: storageId,
      });
    } catch (err) {
      console.error(`  -> Hata (${cat.slug}):`, err.message);
    }
  }

  if (updates.length > 0) {
    console.log(`\nVeritabanı güncelleniyor (${updates.length} kategori)...`);
    const result = await client.mutation(api.categories.bulkSetCategoryStorageIds, {
      updates: updates,
    });
    console.log(`Güncellenen kategori sayısı: ${result.updatedCount}`);
  }

  console.log("\n=== Taşıma Tamamlandı! Güncel Kategoriler Kontrol Ediliyor ===");
  const updatedCategories = await client.query(api.categories.list, { onlyActive: false });
  for (const cat of updatedCategories) {
    console.log(`- ${cat.name} (${cat.slug}): ${cat.image ? "✅ Storage URL Hazır: " + cat.image.substring(0, 50) + "..." : "❌ Görsel Yok"}`);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
