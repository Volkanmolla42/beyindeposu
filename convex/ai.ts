import { v } from "convex/values";
import { generateText, gateway, stepCountIs } from "ai";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const DEFAULT_GATEWAY_MODEL = process.env.BEYINDEPOSU_AI_MODEL || process.env.TMS_AI_MODEL || "zai/glm-5.3-flash";
const DEFAULT_GATEWAY_PROVIDER = process.env.BEYINDEPOSU_AI_PROVIDER || process.env.TMS_AI_PROVIDER || "zai";
const ZAI_LOW_REASONING_OPTIONS = {
  zai: {
    thinking: { type: "enabled" },
    reasoningEffort: "low",
  },
};

export interface GeneratedProductResult {
  success: boolean;
  oemNumber: string;
  title: string;
  brand: string;
  manufacturer: string;
  model: string;
  categoryId?: Id<"categories">;
  categoryName: string;
  categorySlug: string;
  condition: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  tags: string[];
  slug: string;
}

function buildCatalogDescription({
  brand,
  manufacturer,
  oemNumber,
  categoryName,
  condition,
  model,
}: {
  brand: string;
  manufacturer: string;
  oemNumber: string;
  categoryName: string;
  condition: string;
  model: string;
}) {
  const vehicleBrand = brand.trim() || "Genel Uyumlu";
  const producer = manufacturer.trim() || "Orijinal Ekipman Üreticisi";
  const partType = categoryName.trim() || "Oto Elektronik Parçası";
  const partNumber = oemNumber.trim();
  const productCondition = condition.trim() || "Orijinal Çıkma";
  const compatibility = model.trim()
    ? `${vehicleBrand} ${model.trim()}`
    : `${vehicleBrand} Modelleri`;

  return `${partNumber} ${vehicleBrand} ${partType}
${partNumber}, ${vehicleBrand} araçlarda kullanılan ${partType} (${producer}) parçasıdır. Araç elektronik kontrol ve yönetim sistemlerinde görev yapan orijinal çıkma elektronik kontrol modülüdür.

Ürün Bilgileri
Ürün: ${partType}
Marka: ${vehicleBrand}
Model: ${compatibility}
Parça Kodu: ${partNumber}
OEM Referansı: ${partNumber}
Alternatif Referans: ${producer} / Belirtilmemiş
Parça Tipi: ${partType} Kontrol Modülü
Sistem: ${partType} ve Araç Elektronik Yönetimi
Durum: ${productCondition}

Referans Kodları
${partNumber}
Bu parça numarası, ${compatibility} araçları için orijinal donanım üreticisi (${producer}) referansı olarak listelenmektedir.

Uyumlu Araçlar
Marka | Model | Motor | Model Yılı
${vehicleBrand} | ${model.trim() || "Uyumlu Modeller"} | Tüm Motor Seçenekleri | Uygulamaya Göre

${partNumber} parça numaralı ürün ${vehicleBrand} araç serilerinde kullanılmaktadır. Araç donanımına göre soket, pin yapısı, yazılım ve versiyon numarası mutlaka kontrol edilmelidir.

Ürün Açıklaması
${partNumber} ${vehicleBrand} ${partType}, aracın ilgili elektronik kontrol ünitesi olarak sistem sensörleri ve aktüatörleri arasındaki iletişimi yönetir.
Bu parçada meydana gelen olası arızalarda gösterge panelinde arıza lambasının yanması, ilgili sistemde iletişim/CAN-Bus hatası veya modülün işlevini yerine getirememesi gibi belirtiler görülebilir.
Ürün profesyonel olarak araçtan sökülmüş, tüm soket ve pin kontrolleri yapılmış durumdadır. Çıkma elektronik parçalarda montaj sonrası aracın konfigürasyonuna göre adaptasyon, kodlama veya eşleştirme yapılması gerekebilir. Güvenlik ve doğru çalışma için montajın uzman servis personeli tarafından yapılması önerilir.

Uyumluluk Uyarısı
${partNumber} numarasının mevcut parçanız üzerindeki etiket referanslarıyla birebir karşılaştırılması önemlidir. Aynı araç ailesinde farklı donanım ve yazılım versiyonlarına sahip modüller bulunabildiğinden, yalnızca marka ve model bilgisine göre sipariş verilmemelidir.
Sipariş öncesinde mevcut parçanızın üzerindeki parça numarasını, soketlerini, fiziksel yapısını ve mümkünse araç şase (VIN) numarasını mutlaka karşılaştırınız.`;
}

function getAutomotivePartContextHints(oem: string): string {
  const clean = oem.replace(/[\s\-_.]/g, "").toUpperCase();
  const hints: string[] = [];

  // 1. Bosch 10-Digit Formats
  if (/^0281\d{6}$/.test(clean) || clean.startsWith("0281")) {
    hints.push("- BOSCH DİZEL SERİSİ (0281...): Bu parça Bosch EDC (Electronic Diesel Control) Dizel Motor Beynidir (ECU).");
  } else if (/^0261\d{6}$/.test(clean) || clean.startsWith("0261")) {
    hints.push("- BOSCH BENZİN SERİSİ (0261...): Bu parça Bosch Motronic / ME / MED Benzinli Motor Beynidir (ECU).");
  } else if (/^0265\d{6}$/.test(clean) || clean.startsWith("0265") || /^0273\d{6}$/.test(clean) || clean.startsWith("0273")) {
    hints.push("- BOSCH ABS/ESP SERİSİ (0265... / 0273...): Bu parça Bosch ABS / ESP Hidrolik ve Elektronik Fren Beynidir.");
  } else if (/^0285\d{6}$/.test(clean) || clean.startsWith("0285")) {
    hints.push("- BOSCH AIRBAG SERİSİ (0285...): Bu parça Bosch SRS / Hava Yastığı Kontrol Modülüdür.");
  }

  // 2. Rover / MG / Land Rover Specific Patterns
  if (clean === "YWC112330" || clean === "YWC000900" || clean === "YWC106880" || clean === "YWC112340" || clean === "YWC112320") {
    hints.push("- ROVER 75 / MG ZT GÖVDE KONFOR BEYNİ: 'YWC112330' / 'YWC000900' parçası Body Control Unit (BCU) / Gövde Konfor Beynidir (Merkezi kilit, cam ve gövde elektroniğini yönetir. Kesinlikle Airbag DEĞİLDİR).");
  } else if (clean === "YWC107010" || clean === "YWC105330" || clean === "YWC106230") {
    hints.push("- ROVER 25 / 45 AIRBAG BEYNİ: Bu parça Rover 25/45 SRS Airbag Kontrol Modülüdür.");
  } else if (/^NNN\d{6}$/i.test(clean) || /^MKC\d{6}$/i.test(clean) || /^MSB\d{6}$/i.test(clean)) {
    hints.push("- ROVER/LAND ROVER MOTOR BEYNİ: 'NNN...', 'MKC...', 'MSB...' kodları MEMS / TD5 / EDC Motor Beynidir.");
  }

  // 3. Magneti Marelli Patterns
  if (/^IAW/i.test(clean) || /^MJD/i.test(clean)) {
    hints.push("- MAGNETI MARELLI MOTOR BEYNİ: 'IAW...' ve 'MJD...' serileri Motor Kontrol Ünitesidir (ECU).");
  } else if (/^NBC/i.test(clean)) {
    hints.push("- MAGNETI MARELLI GÖVDE BEYNİ: 'NBC...' serisi Fiat Body Computer / Gövde Konfor Modülüdür.");
  }

  // 4. Siemens / Continental / Sagem Patterns
  if (/^5WK/i.test(clean) || /^5WP/i.test(clean) || /^S1[012]/i.test(clean)) {
    hints.push("- SIEMENS / CONTINENTAL / SAGEM: '5WK...', '5WP...', 'S11...' kodları Simos / Sirius / Sagem Motor Beyni veya CAS/BSI/UCH modülleridir.");
  }

  // 5. Delphi Patterns
  if (/^DCM/i.test(clean) || /^DDCR/i.test(clean)) {
    hints.push("- DELPHI DİZEL MOTOR BEYNİ: 'DCM...' ve 'DDCR' serileri 1.5 dCi / HDI / TDCi Dizel Motor Beynidir (ECU).");
  }

  // 6. VAG Group (VW / Audi / Seat / Skoda)
  if (/906\d{2,3}[A-Z]?$/.test(clean) || /03[8LGP]906/i.test(clean) || /06[AF]906/i.test(clean)) {
    hints.push("- VAG MOTOR BEYNİ: '...906...' içeren VAG referansları Motor Kontrol Ünitesidir (ECU).");
  } else if (/614\d{2,3}[A-Z]?$/.test(clean)) {
    hints.push("- VAG ABS FREN BEYNİ: '...614...' içeren VAG referansları ABS / ESP Hidrolik Fren Beynidir.");
  } else if (/959655[A-Z]?$/.test(clean)) {
    hints.push("- VAG AIRBAG BEYNİ: '...959 655...' içeren VAG referansları SRS Hava Yastığı Beynidir.");
  } else if (/907\d{2,3}[A-Z]?$/.test(clean)) {
    hints.push("- VAG GÖVDE / KONFOR: '...907...' içeren VAG referansları BCM / Gateway / Gövde Konfor Modülüdür.");
  }

  // 7. PSA (Peugeot / Citroen)
  if (/^96\d{6}80$/.test(clean) || /^98\d{6}80$/.test(clean)) {
    hints.push("- PSA (PEUGEOT / CITROEN): '96xxxxxx80' Peugeot-Citroen OEM donanım kodudur.");
  }

  // 8. Mercedes-Benz
  if (/^A\d{9,12}$/i.test(clean) || /^A\d{3}\d{3}\d{4}$/i.test(clean)) {
    hints.push("- MERCEDES-BENZ: 'A...' ile başlayan referans Mercedes-Benz orijinal elektronik kontrol ünitesidir.");
  }

  return hints.length > 0 ? "\nOTOMOTİV ÜRETİCİ PARÇA KODU TESPİT DOĞRULAMASI:\n" + hints.join("\n") : "";
}

type GeneratedProductPayload = {
  title?: unknown;
  brand?: unknown;
  manufacturer?: unknown;
  model?: unknown;
  categorySlug?: unknown;
  condition?: unknown;
  description?: unknown;
  metaTitle?: unknown;
  metaDescription?: unknown;
  metaKeywords?: unknown;
  tags?: unknown;
  slug?: unknown;
};

function parseJsonObject(value: string): GeneratedProductPayload | null {
  const cleaned = value.replace(/```json/gi, "").replace(/```/g, "").trim();
  for (let start = 0; start < cleaned.length; start += 1) {
    if (cleaned[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(cleaned.slice(start, index + 1));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return parsed as GeneratedProductPayload;
            }
          } catch {
            // Try the next balanced object when the model included an invalid example first.
          }
          break;
        }
      }
    }
  }
  return null;
}

export const generateProductDetails = action({
  args: {
    oemNumber: v.string(),
    additionalHint: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    oemNumber: v.string(),
    title: v.string(),
    brand: v.string(),
    manufacturer: v.string(),
    model: v.string(),
    categoryId: v.optional(v.id("categories")),
    categoryName: v.string(),
    categorySlug: v.string(),
    condition: v.string(),
    description: v.string(),
    metaTitle: v.string(),
    metaDescription: v.string(),
    metaKeywords: v.string(),
    tags: v.array(v.string()),
    slug: v.string(),
  }),
  handler: async (ctx, args): Promise<GeneratedProductResult> => {
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
      throw new Error(
        "AI Gateway kimlik bilgisi bulunamadı. Convex geliştirme ortamına AI_GATEWAY_API_KEY veya VERCEL_OIDC_TOKEN tanımlayınız."
      );
    }

    const categories = await ctx.runQuery(api.categories.list, { onlyActive: false });

    const categoriesContext = (categories || [])
      .map((c) => `- "${c.name}" (slug: "${c.slug}")`)
      .join("\n");

    const partTaxonomyHints = getAutomotivePartContextHints(args.oemNumber);

    const systemPrompt = `Sen otomotiv elektronik ve elektromekanik parçaları (Motor Beyinleri, Gövde/Konfor Modülleri, Fren/ABS, Hava Yastığı/Airbag, Şanzıman Beyinleri, Cam Krikosu Motorları, Silecek Motorları, Sigorta Kutuları / BSM / BSI / SAM) konusunda uzman bir baş teknik ürün yöneticisisin.

GÖREVİN:
Verilen OEM / Parça Numarasını, Exa web arama aracından gelen canlı sonuçları ve kullanıcı ipucunu inceleyerek parçanın türünü (Örn: Cam Motoru, Kapı Modülü, Motor Beyni, Gövde Beyni, ABS, Airbag, Şanzıman vb.), araç markasını, model/motor uyumluluğunu ve teknik özelliklerini mümkün olan en yüksek doğrulukla tespit edip eksiksiz JSON üretmektir.

MEVCUT SİTE KATEGORİ LİSTESİ:
${categoriesContext}
${partTaxonomyHints}

ÖNCELİKLİ DOĞRULAMA KURALI:
1. Exa canlı parça arama sonuçları ve KULLANICI EK AÇIKLAMASI birincil doğrulama kaynağıdır. Kaynaklar çelişiyorsa kesinlik iddiasında bulunma ve needsReview mantığıyla temkinli içerik üret.
2. Parça bir "Cam Motoru" (Window Motor / Lève-vitre), "Silecek Motoru" (Wiper Motor), "Fan Motoru" veya "Röle" ise KESİNLİKLE Motor Beyni (ECU) veya Sigorta Kutusu (BSM) olarak uydurma. Gerçek parça türü neyse başlık, uyumlu araçlar ve tüm açıklamayı o parça türüne göre oluştur.
3. PSA (96xxxxxx80) numaraları sadece ECU/BSM değildir; cam motoru, kilit motoru, sensör vb. olabilir. Arama sonucundaki donanım türüne kesinlikle sadık kal.

ÜRÜN BİLGİSİ KURALLARI:
- Ürün Başlığı: "[Araç Markası] [Model/Seri] [Parça Türü/Modül Adı] [Üretici/Model] [OEM Kodu] Orijinal Çıkma"
- manufacturer: Üreticiyi yaz (ör. "VAG (Audi / VW)", "Bosch", "Continental", "Magneti Marelli", "Delphi", "Siemens VDO", "Valeo", "Denso", "Pektron", "Peugeot / Citroen").
- brand: Ana araç markası (ör. "Peugeot", "Citroen", "Rover", "Renault", "Volkswagen", "BMW", "Mercedes-Benz", "Fiat", "Ford", "Audi").
- categorySlug: Yukarıdaki listeden parçaya en uygun kategori slug'ını seç.

AÇIKLAMA (description) ALANI FORMATI (ZORUNLU ŞABLON):
description alanında BİREBİR şu başlıklar ve zengin teknik akış yer almalıdır (Markdown formatında):

[OEM_KODU] [Marka] [Parça Türü]
[OEM_KODU], [Marka] araçlarda kullanılan orijinal [Parça Türü] parçasıdır. [Parçanın araç üzerindeki konumu, temel görevi ve yönettiği sistemler hakkında 2-3 cümlelik net teknik açıklama].

Ürün Bilgileri
Ürün: [Parça Türü / Modül Adı]
Marka: [Araç Markası]
Model: [Uyumlu Araç Modelleri ve Kasa Tipleri]
Parça Kodu: [OEM Kodu]
OEM Referansı: [OEM Referansı]
Alternatif Referans: [Varsa İkincil / Bosch / Üretici Kodu veya Yoksa Belirtilmemiş]
Parça Tipi: [Elektronik Kontrol Ünitesi / Cam Motoru / Gövde Modülü / vb.]
Sistem: [Yönetilen Sistem Adı, örn: Elektrikli Cam ve Kapı Sistemi / Gövde Elektroniği / Motor Yönetim Sistemi / ABS Fren]

Referans Kodları
[OEM Kodu]
[Varsa Alternatif Üretici Kodları]
[Parça kodunun kataloglardaki kullanım ve çapraz referans açıklaması]

Uyumlu Araçlar
Marka | Model | Motor | Model Yılı
[Marka 1] | [Model 1] | [Motor 1] | [Yıl Aralığı 1]
[Marka 2] | [Model 2] | [Motor 2] | [Yıl Aralığı 2]

[Uyumlu araçlar, motor kodları ve soket/donanım versiyon kontrolü ile ilgili 1-2 cümlelik teyit notu]

Ürün Açıklaması
[Parçanın detaylı teknik çalışma prensibi, montaj konumu ve elektrik/sinyal bağlantıları].
[Bu parçada meydana gelen olası arıza belirtileri: çalışmama, zorlanma, arıza lambası, ses yapma veya iletişim kaybı].
[Montaj, çıkma parça testi, soket bağlantıları ve uzman servis montajı tavsiyesi].

Uyumluluk Uyarısı
[Parça referans numaralarının mevcut parçanız üzerindeki etiket ile birebir karşılaştırılmasının önemi. Donanım, soket ve yön (sağ/sol) uyarısı].
Sipariş öncesinde mevcut parçanızın üzerindeki parça numarasını, soketlerini, pin yapısını ve mümkünse araç şase (VIN) numarasını mutlaka karşılaştırınız.

ZORUNLU ÇIKTI KURALLARI:
1. SADECE geçerli ve temiz bir JSON nesnesi döndür (Markdown backtickleri veya harici metin yazma).
2. JSON alanları:
{
  "title": string,
  "brand": string,
  "manufacturer": string,
  "model": string,
  "categorySlug": string,
  "condition": string,
  "description": string,
  "metaTitle": string,
  "metaDescription": string,
  "metaKeywords": string,
  "tags": array of strings,
  "slug": string
}`;

    const userMessage = `Lütfen aşağıdaki OEM / Parça Numarasını otomotiv katalog standartlarına göre analiz ederek yukarıdaki zorunlu açıklama şablonuna birebir uygun şekilde ürün bilgilerini JSON olarak üret:
OEM / Parça Numarası: ${args.oemNumber.trim()}
${args.additionalHint ? `KULLANICI EK AÇIKLAMASI / DOĞRULAMA İPUCU: "${args.additionalHint}" (Kullanıcı bu parçanın türü veya araç modeli hakkında bu bilgiyi vermiştir. Parçayı analiz ederken bu yönlendirmeyi öncelikle doğrula ve dikkate al.)` : ""}
`;

    const generated = await generateText({
      model: gateway(DEFAULT_GATEWAY_MODEL),
      system: systemPrompt,
      prompt: `${userMessage}\n\nOEM kodunu doğrulamak için önce AI Gateway Exa web arama aracını kullan. Üretici ve güvenilir parça kataloglarını önceliklendir; arama kaynakları yetersizse bunu ürün alanlarında kesin gerçek gibi sunma.`,
      tools: {
        webSearch: gateway.tools.exaSearch({
          type: "fast",
          numResults: 8,
          contents: {
            text: { maxCharacters: 6000, verbosity: "compact" },
            highlights: { maxCharacters: 1200 },
          },
        }),
      },
      toolChoice: { type: "tool", toolName: "webSearch" },
      stopWhen: stepCountIs(2),
      temperature: 0,
      maxOutputTokens: 5500,
      providerOptions: {
        ...(DEFAULT_GATEWAY_PROVIDER === "zai" ? ZAI_LOW_REASONING_OPTIONS : {}),
        gateway: {
          order: [DEFAULT_GATEWAY_PROVIDER],
          tags: ["beyindeposu", "admin-product-generator", "exa"],
        },
      },
    });

    const parsed = parseJsonObject(generated.text);
    if (!parsed) {
      throw new Error("AI Gateway yanıtından geçerli bir ürün JSON nesnesi çıkarılamadı.");
    }

    // 4. Match Category ID
    const categorySlug = typeof parsed.categorySlug === "string" ? parsed.categorySlug : "";
    let matchedCat = (categories || []).find((c) => c.slug === categorySlug);
    if (!matchedCat && categorySlug) {
      matchedCat = (categories || []).find((c) =>
        c.name.toLowerCase().includes(categorySlug.toLowerCase())
      );
    }
    if (!matchedCat && categories && categories.length > 0) {
      matchedCat = categories[0];
    }

    const resolvedBrand = typeof parsed.brand === "string" && parsed.brand.trim() && parsed.brand.trim() !== "Genel"
      ? parsed.brand.trim()
      : "Genel Uyumlu";
    const resolvedManufacturer = typeof parsed.manufacturer === "string" && parsed.manufacturer.trim()
      ? parsed.manufacturer.trim()
      : "Orijinal ekipman üreticisi";
    const resolvedModel = typeof parsed.model === "string" && parsed.model.trim() !== "Genel Uyumlu"
      ? parsed.model.trim()
      : "";
    const resolvedCondition = typeof parsed.condition === "string" && parsed.condition.trim()
      ? parsed.condition.trim()
      : "Orijinal Çıkma";
    const resolvedTitle = typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : `${args.oemNumber} Otomotiv Parçası`;
    const resolvedMetaTitle = typeof parsed.metaTitle === "string" && parsed.metaTitle.trim()
      ? parsed.metaTitle.trim()
      : `${args.oemNumber} Orijinal Çıkma Parça | Beyin Deposu`;
    const resolvedMetaDescription = typeof parsed.metaDescription === "string" ? parsed.metaDescription : "";
    const resolvedMetaKeywords = typeof parsed.metaKeywords === "string" ? parsed.metaKeywords : "";
    const resolvedSlug = typeof parsed.slug === "string" && parsed.slug.trim()
      ? parsed.slug.trim()
      : `${args.oemNumber.toLowerCase()}-parca`
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
    const resolvedTags = Array.isArray(parsed.tags) && parsed.tags.every((tag): tag is string => typeof tag === "string")
      ? parsed.tags
      : [args.oemNumber, "Çıkma Parça"];

    return {
      success: true,
      oemNumber: args.oemNumber.trim(),
      title: resolvedTitle,
      brand: resolvedBrand,
      manufacturer: resolvedManufacturer,
      model: resolvedModel,
      categoryId: matchedCat?._id,
      categoryName: matchedCat?.name || "Oto Elektronik",
      categorySlug: matchedCat?.slug || "oto-elektronik",
      condition: resolvedCondition,
      description:
        parsed.description && typeof parsed.description === "string" && parsed.description.trim().length > 50
          ? parsed.description.trim()
          : buildCatalogDescription({
            brand: resolvedBrand,
            manufacturer: resolvedManufacturer,
            oemNumber: args.oemNumber,
            categoryName: matchedCat?.name || "Oto Elektronik",
            condition: resolvedCondition,
            model: resolvedModel,
          }),
      metaTitle: resolvedMetaTitle,
      metaDescription: resolvedMetaDescription,
      metaKeywords: resolvedMetaKeywords,
      tags: resolvedTags,
      slug: resolvedSlug,
    };
  },
});
