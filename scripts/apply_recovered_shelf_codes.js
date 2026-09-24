/*
 * Applies only the one-to-one shelf-code recoveries produced by
 * reconcile_zip_shelf_codes.js. It deliberately ignores ambiguous records.
 *
 * Dry run: node scripts/apply_recovered_shelf_codes.js
 * Apply:   node scripts/apply_recovered_shelf_codes.js --apply
 */

const fs = require("fs");
const path = require("path");
const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

function loadEnvironmentFile(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

async function fetchAllProducts(client) {
  const firstPage = await client.query(api.products.getProductsPage, {
    page: 1,
    pageSize: 200,
    includeReview: true,
  });
  const products = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const response = await client.query(api.products.getProductsPage, {
      page,
      pageSize: 200,
      includeReview: true,
    });
    products.push(...response.items);
  }
  return products;
}

function updateArguments(product, shelfCode) {
  return {
    id: product._id,
    title: product.title,
    slug: product.slug,
    oemNumber: product.oemNumber,
    shelfCode,
    categoryId: product.categoryId,
    brand: product.brand,
    model: product.model,
    condition: product.condition,
    inStock: product.inStock,
    description: product.description,
    images: product.images,
    imageStorageIds: product.imageStorageIds,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    tags: product.tags,
  };
}

const apply = process.argv.includes("--apply");
const reportPath = path.join(process.cwd(), ".tms-import", "shelf-reconciliation.json");
const journalPath = path.join(process.cwd(), ".tms-import", "shelf-code-update-journal.json");

async function main() {
  if (!fs.existsSync(reportPath)) throw new Error(`Eşleştirme raporu bulunamadı: ${reportPath}`);
  loadEnvironmentFile(path.join(process.cwd(), ".env.local"));
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("NEXT_PUBLIC_CONVEX_URL tanımlı değil.");

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const corrections = report.records.filter((record) => record.status === "recovered_from_image");
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  const products = await fetchAllProducts(client);
  const productsById = new Map(products.map((product) => [product._id, product]));
  const journal = {
    startedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    expectedCorrections: corrections.length,
    applied: [],
    alreadyApplied: [],
    blocked: [],
  };

  for (let index = 0; index < corrections.length; index += 1) {
    const correction = corrections[index];
    const product = productsById.get(correction.productId);
    const entry = {
      productId: correction.productId,
      from: correction.storedShelfCode,
      to: correction.recoveredShelfCode,
    };

    if (!product) {
      journal.blocked.push({ ...entry, reason: "Ürün artık Convex'te bulunamadı." });
      continue;
    }
    if (product.shelfCode === correction.recoveredShelfCode) {
      journal.alreadyApplied.push(entry);
      continue;
    }
    if (product.shelfCode !== correction.storedShelfCode) {
      journal.blocked.push({ ...entry, actual: product.shelfCode || null, reason: "Raf kodu rapor oluşturulduktan sonra değişmiş." });
      continue;
    }

    if (apply) await client.mutation(api.products.update, updateArguments(product, correction.recoveredShelfCode));
    journal.applied.push(entry);
    fs.writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
    process.stdout.write(`\r${apply ? "Güncelleniyor" : "Doğrulanıyor"}: ${index + 1}/${corrections.length}`);
  }

  journal.completedAt = new Date().toISOString();
  fs.writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
  process.stdout.write("\n");
  console.log(JSON.stringify({
    mode: journal.mode,
    applied: journal.applied.length,
    alreadyApplied: journal.alreadyApplied.length,
    blocked: journal.blocked.length,
    journalPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
