const Tesseract = require("tesseract.js");
const AdmZip = require("adm-zip");
const path = require("path");

const PRODUCTS_ZIP = "C:\\Users\\volkan\\Desktop\\products.zip";

// Automotive regex patterns to extract from raw OCR text
const AUTOMOTIVE_EXTRACTION_RULES = [
  // Bosch: 0 281 xxx xxx or 0 261 xxx xxx
  {
    name: "Bosch",
    regex: /(0\s*[23]\s*[6801]\s*[0-9]\s*[0-9]{3}\s*[0-9]{3})/i,
    format: (m) => m[1].replace(/\s+/g, ""),
  },
  // VAG (VW/Audi/Seat/Skoda): 4B0 907 401 H or 038 906 018 etc.
  {
    name: "VAG (VW/Audi)",
    regex: /([0-9A-Z]{3}\s*[0-9]{3}\s*[0-9]{3}\s*[A-Z]{0,3})/i,
    format: (m) => m[1].trim(),
  },
  // Mercedes: A 027 545 96 32 or A0275459632
  {
    name: "Mercedes-Benz",
    regex: /(A\s*[0-9]{3}\s*[0-9]{3}\s*[0-9]{2}\s*[0-9]{2}|A\s*[0-9]{10})/i,
    format: (m) => m[1].replace(/\s+/g, ""),
  },
  // Renault: 8200 xxx xxx or S113717205D or HOM8200
  {
    name: "Renault",
    regex: /(8200\s*[0-9]{6}|S11[0-9A-Z]{7}|HOM8200[0-9]{6}|23710\s*[0-9A-Z]{5}R)/i,
    format: (m) => m[1].replace(/\s+/g, ""),
  },
  // Ford: 93BG 15K600 GE or 3M51 ...
  {
    name: "Ford",
    regex: /([0-9A-Z]{4}\s*1[0-9][A-Z0-9]{3,5}\s*[A-Z]{1,3})/i,
    format: (m) => m[1].trim(),
  },
  // Opel / GM: 09 115 062 or 12 992 406 or Q1T...
  {
    name: "Opel / GM",
    regex: /((?:09|12|13|55|24)\s*[0-9]{3}\s*[0-9]{3}|Q1T[0-9A-Z]{6})/i,
    format: (m) => m[1].replace(/\s+/g, ""),
  },
  // PSA Peugeot Citroen: 96 xxx xxx 80
  {
    name: "PSA Peugeot Citroen",
    regex: /(96\s*[0-9]{3}\s*[0-9]{3,5}\s*80)/i,
    format: (m) => m[1].replace(/\s+/g, ""),
  },
  // Siemens: 5WK4 xxxx
  {
    name: "Siemens",
    regex: /(5WK[0-9A-Z]{4,7})/i,
    format: (m) => m[1].replace(/\s+/g, ""),
  },
];

function extractAutomotiveOEMFromText(text) {
  if (!text) return null;
  const cleanText = text.replace(/[\r\n]+/g, " ");

  for (const rule of AUTOMOTIVE_EXTRACTION_RULES) {
    const match = cleanText.match(rule.regex);
    if (match) {
      return {
        oem: rule.format(match),
        rule: rule.name,
        rawMatch: match[0],
      };
    }
  }
  return null;
}

async function testLocalEngine() {
  console.log("🔍 YEREL OCR (TESSERACT) & OTOMOTİV AYRIŞTIRMA TESTİ...");
  const zip = new AdmZip(PRODUCTS_ZIP);

  const testCodes = ["201-01-0347", "701-01-0001", "801-01-0001", "301-02-0005", "601-01-0004"];

  for (const code of testCodes) {
    const entry = zip.getEntries().find((e) => e.entryName.includes(`${code}-1`));
    if (!entry) continue;

    console.log(`\n-------------------------------------------------------------`);
    console.log(`📦 İnceleniyor: ${code}`);

    const imgBuffer = entry.getData();
    const {
      data: { text },
    } = await Tesseract.recognize(imgBuffer, "eng");

    const result = extractAutomotiveOEMFromText(text);

    if (result) {
      console.log(`✅ BULUNAN GERÇEK OEM: ${result.oem} (${result.rule})`);
      console.log(`📁 Oluşacak Dosya Adı: ${result.oem.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${code}-1.jpg`);
    } else {
      console.log(`⚠️ Etiket okunamadı -> inceleme_listesi.json'a eklenecek (Dosya yazılmayacak).`);
      console.log(`   OCR Ham Çıktı: ${text.replace(/\n+/g, " ").slice(0, 80)}...`);
    }
  }
}

testLocalEngine().catch(console.error);
