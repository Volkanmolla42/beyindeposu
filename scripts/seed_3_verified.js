const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

const DEV_CONVEX_URL = "https://aromatic-elk-297.convex.cloud";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

async function seed() {
  console.log("🚀 1. Adım: 3 adet doğrulanmış görsel 'public/uploads/products/' içine kopyalanıyor...");

  // Clean upload dir
  if (fs.existsSync(UPLOAD_DIR)) {
    fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Copy 3 verified images
  fs.copyFileSync(
    path.join(process.cwd(), "temp_sample", "sample1.jpg"),
    path.join(UPLOAD_DIR, "opel-09115062-corsa-b.jpg")
  );

  fs.copyFileSync(
    path.join(process.cwd(), "temp_sample", "sample_vw.jpg"),
    path.join(UPLOAD_DIR, "audi-4b0907401h-passat-ecu.jpg")
  );

  fs.copyFileSync(
    path.join(process.cwd(), "temp_sample", "sample_mb.jpg"),
    path.join(UPLOAD_DIR, "mercedes-a0275459632-w168-ecu.jpg")
  );

  console.log("✅ 3 adet fotoğraf temiz isimlerle hazırlandı.");

  // Run convex dev sync to register mutation
  console.log("\n⚙️ 2. Adım: Convex Dev senkronize ediliyor...");
  execSync("npx convex dev --once --typecheck=disable", { stdio: "inherit" });

  // Execute seed mutation
  console.log("\n📦 3. Adım: Doğrulanmış 3 ürün Convex'e yazılıyor...");
  const client = new ConvexHttpClient(DEV_CONVEX_URL);
  const result = await client.mutation(api.importData.clearAndSeedVerifiedProducts, {});

  console.log(`\n🎉 BAŞARILI! ${result.count} adet gerçek etiket bilgili ürün yerel veritabanına eklendi.`);
}

seed().catch(console.error);
