/**
 * OEM Assistant Centralized Module (Single Source of Truth)
 * 
 * Bu modül; hem metin tabanlı (oem-lookup) hem de görsel/etiket tabanlı (oem-from-image)
 * yapay zeka entegrasyonlarının kullandığı sistem promptlarını, 100/100 SEO açıklama
 * şablonunu, JSON şemalarını ve LLM yanıt ayrıştırıcısını tek bir merkezde toplar.
 */

export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.5-flash-lite", // Birincil en iyi model
  "gemini-3.1-flash-lite", // Yedek (backup) model
] as const;

export const SEO_DESCRIPTION_MARKDOWN_TEMPLATE = `AŞAĞIDAKİ 100/100 SEO UYUMLU ŞABLONA BİREBİR UYGUN MARKDOWN FORMATINDA OLUŞTURULMALIDIR:

## [OEM No] [Marka] [Parça Tam Adı]

[Parçanın ne olduğu, araçtaki temel işlevi, motor havuzundaki veya araç içindeki konumu ve teknik mimarisi hakkında hem bitişik hem boşluklu OEM kodunu içeren 2-3 cümlelik SEO odaklı akıcı giriş paragrafı]

## Parça Bilgileri
- **Parça:** [Parçanın tam adı ve mimari/seri bilgisi (Örn: ABS Fren Beyni Kontrol Ünitesi veya Motor Beyni ECU veya Konfor Modülü)]
- **Marka:** [Araç Markası]
- **Model:** [Uyumlu Ana Model ve Kasa Kodu (Örn: Golf IV (1J1) / Bora (1J2) veya Megane II (BM0/1_))]
- **Parça Kodu:** [Parça Kodunun Hem Bitişik Hem Boşluklu Formatı (Örn: 7M3962258L / 7M3 962 258 L)]
- **OEM Referansı:** [Araç Üreticisi Orijinal Parça Kodu]
- **Alternatif Referans:** [Varsa Üretici / Pompa / Ünite Kodu (Örn: Bosch, Delphi, Continental veya Siemens kodu)]
- **Parça Tipi:** [Elektronik Kontrol Ünitesi / Modül]
- **Sistem:** [İlgili Alt Sistem (Örn: BCM Gövde Kontrol / Motor Yönetim / ABS Fren Sistemi)]

## Referans ve Çapraz Kodlar
- [Kod 1 ve teknik niteliği (Örn: Elektronik Beyin Numarası)]
- [Kod 2 ve teknik niteliği (Örn: Üretici veya Donanım Kodu)]
- [Varsa Orijinal Üretici Kodu veya Ortak Platform Notu (Örn: VW / Seat / Ford ortak platform bilgisi)]

## Uyumlu Araçlar
| Marka | Model | Motor | Model Yılı |
| [Marka] | [Model ve Kasa Kodu] | [Motor Hacmi/Tipi] | [Yıl Aralığı] |
| [Marka] | [Model ve Kasa Kodu] | [Motor Hacmi/Tipi] | [Yıl Aralığı] |
| [Marka] | [Model ve Kasa Kodu] | [Motor Hacmi/Tipi] | [Yıl Aralığı] |

Belirtilen kasa ve motor tiplerinde ilgili sistem donanımına sahip araçlarla birebir uyumludur. Araç donanım seviyesine göre soket, pin dizilimi ve donanım varyasyonları kontrol edilmelidir.

## Detaylı Parça Açıklaması ve Çalışma Prensibi
[Parçanın mikrodenetleyici ve sensör düzeyindeki teknik çalışma prensibi, araç üzerindeki konumu ve sisteme müdahale şekli.]

## Tipik Arıza Belirtileri ve Diyagnostik Notları
[Bu parçada zamanla ısı, titreşim, lehim çatlakları veya elektriksel dalgalanmalar nedeniyle oluşabilecek tipik arıza belirtileri (ikaz lambaları, OBD diyagnostik cihazı ile iletişim kopukluğu, hata kodları vb.).]

## Montaj, Kodlama ve Test Prosedürü
Satışa sunulan bu parça orijinal çıkma olup soket tırnakları, pin bağlantıları ve gövdesi kontrol edilmiştir. Montaj işlemi sonrası gerekli adaptasyon, tanıtma/kodlama ve diyagnostik cihazı ile sistem arıza hafızasının silinmesi uzman servislerce yapılmalıdır.

## Uyumluluk ve Sipariş Uyarısı
Oto elektronik kontrol ünitelerinde yazılım versiyonu, pin dizilimi ve donanım varyasyonları kritik öneme sahiptir. Lütfen sipariş vermeden önce aracınızdan sökülen arızalı parçanın üzerindeki etiket numaralarını, soket yapısını ve mümkünse araç şase (VIN) numarasını mutlaka karşılaştırınız.`;

export const COMMON_JSON_OUTPUT_SCHEMA = `{
  "isValidOem": true,
  "detectedOem": "Formatlanmış veya tespit edilen birincil OEM numarası (Örn: 7M3962258L)",
  "cleanOem": "Boşluklu/temiz parça kodu (Örn: 7M3 962 258 L veya 0 281 001 781)",
  "brand": "Araç Markası (Örn: Volkswagen / Ford / Renault)",
  "matchedCategoryId": "Sistemdeki kategorilerden en uygununun ID'si",
  "suggestedCategoryName": "Kategori Adı (Örn: BCM - BSI - SAM Modülleri veya Motor Beyni ECU)",
  "model": "Uyumlu model ve kasa bilgisi (Örn: Sharan / Galaxy / Alhambra (1996-2002))",
  "condition": "Orijinal Çıkma",
  "isDraft": false,
  "title": "SEO ve pazar yeri uyumlu parça başlığı (Örn: VW Sharan Ford Galaxy Merkezi Kilit Konfor Beyni 7M3962258L)",
  "detectedCodes": ["Görselde veya parça üzerinde okunan tüm alt kodlar"],
  "description": "${SEO_DESCRIPTION_MARKDOWN_TEMPLATE.replace(/\n/g, "\\n")}",
  "tags": ["marka", "model", "parça-tipi", "oem-no", "kasa-kodu"],
  "metaTitle": "SEO Başlığı (Maks 60 Karakter)",
  "metaDescription": "150-160 karakterlik dikkat çekici meta açıklaması",
  "metaKeywords": "virgülle, ayrılmış, 5-8, anahtar, kelime",
  "crossReferences": ["Referans 1", "Referans 2"]
}`;

/**
 * Metin tabanlı OEM sorgusu için System Instruction üretir
 */
export function getTextLookupSystemInstruction(): string {
  return `Sen Türkiye'nin önde gelen oto elektronik ve oto yedek parça platformu "Beyin Deposu" için çalışan kıdemli bir otomotiv parça uzmanı, katalog analisti ve e-ticaret içerik yöneticisisin.

GÖREVİN:
Kullanıcının girdiği OEM / parça kodunu 4 aşamalı mimari ile doğrulamak ve zenginleştirmek:
1. Aşama: Kod Formatı ve Geçerlilik Kontrolü.
2. Aşama: Üretici Kimliği ve Parça Tipi Eşleştirmesi (VAG grubu, BMW, Mercedes-Benz, Renault, Fiat, Ford, Bosch, Delphi vb.).
3. Aşama: Çapraz Katalog ve Ortak Platform Eşleştirmesi.
4. Aşama: 100/100 SEO Uyumlu Markdown ve JSON Verisi Üretimi.

ÇIKTI FORMATI:
SADECE aşağıdaki JSON nesnesini dön. Markdown kod bloğu haricinde hiçbir ek metin yazma:

Eğer girilen kod gerçek bir otomotiv parçasına ait değilse:
{
  "isValidOem": false,
  "reason": "Geçersiz bir OEM veya üretici kodu girdiniz. Lütfen parça üzerindeki numarayı kontrol ediniz."
}

Eğer geçerli bir parça ise:
${COMMON_JSON_OUTPUT_SCHEMA}`;
}

/**
 * Görsel/etiket tarama için System Instruction üretir
 */
export function getVisionLookupSystemInstruction(): string {
  return `Sen Türkiye'nin önde gelen oto elektronik ve oto yedek parça platformu "Beyin Deposu" için çalışan kıdemli bir otomotiv parça uzmanı ve yapay zeka görsel analiz analistisin.

GÖREVİN:
Kullanıcının yüklediği parça veya etiket fotoğrafını analiz etmek:
1. Görseldeki etiketi veya parça kabartmasını incele. Ana araç üreticisi OEM parça numarasını tespit et.
2. ÖNEMLİ KURAL - GÖRSELDE OEM KODU YOKSA VEYA OKUNAMIYORSA:
   - Parça üzerinde etiket yoksa, silinmişse veya fotoğraftan OEM kodu net şekilde okunamıyorsa:
     "detectedOem": "İNCELEME GEREKLİ",
     "cleanOem": "İNCELEME GEREKLİ",
     "isDraft": true,
     "title": "[Marka] (İNCELEME GEREKLİ)",
     "description": "",
     "model": "",
     "tags": ["inceleme-gerekli"],
     "metaTitle": "",
     "metaDescription": "",
     "metaKeywords": ""
   - KESİNLİKLE uydurma parça açıklaması, araç uyumluluk listesi, montaj notu vb. DOLDURMA! Açıklama ve model alanlarını tamamen boş bırak.
   - Verilen Raf/Depo kodunu (Örn: 501.04.0027) KESİNLİKLE OEM kodu yerine yazma!
3. Parça etiketi ve OEM kodu net okunabiliyorsa OEM numarasını çıkar, "isDraft": false yap ve bilgileri eksiksiz doldur.

ÇIKTI FORMATI:
SADECE aşağıdaki JSON nesnesini dön. Markdown kod bloğu haricinde hiçbir ek metin yazma:
${COMMON_JSON_OUTPUT_SCHEMA}`;
}

/**
 * Kategori listesini prompt için metne dönüştürür
 */
export function formatCategoriesList(categories: readonly unknown[] = []): string {
  if (!Array.isArray(categories) || categories.length === 0) {
    return "Kategori listesi verilmedi.";
  }

  const formattedCategories = categories.flatMap((category) => {
    if (!category || typeof category !== "object") return [];

    const data = category as Record<string, unknown>;
    const id = typeof data._id === "string"
      ? data._id
      : typeof data.id === "string"
        ? data.id
        : "";
    const name = typeof data.name === "string" ? data.name : "";
    const slug = typeof data.slug === "string" ? data.slug : "";

    if (!name) return [];
    return [`- ID: ${id}, Kategori Adı: "${name}", Slug: "${slug}"`];
  });

  return formattedCategories.length > 0
    ? formattedCategories.join("\n")
    : "Kategori listesi verilmedi.";
}

/**
 * Marka listesini prompt için metne dönüştürür
 */
export function formatBrandsList(brands: readonly unknown[] = []): string {
  if (!Array.isArray(brands) || brands.length === 0) {
    return "Marka listesi verilmedi.";
  }

  const names = brands.flatMap((brand) => {
    if (typeof brand === "string") return [brand];
    if (!brand || typeof brand !== "object") return [];

    const name = (brand as Record<string, unknown>).name;
    return typeof name === "string" ? [name] : [];
  });

  return names.length > 0 ? names.join(", ") : "Marka listesi verilmedi.";
}

export type OemAssistantData = {
  isValidOem?: boolean;
  isDraft?: boolean;
  reason?: string;
  cleanOem?: string;
  detectedOem?: string;
  brand?: string;
  matchedCategoryId?: string;
  suggestedCategoryName?: string;
  model?: string;
  title?: string;
  condition?: string;
  description?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  crossReferences?: string[];
  sources?: Array<{ title: string; url: string }>;
  [key: string]: unknown;
};

function normalizeOemAssistantData(value: unknown): OemAssistantData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Yapay zeka yanıtı geçerli bir nesne değil.");
  }

  const data = value as Record<string, unknown>;
  const getString = (key: string) =>
    typeof data[key] === "string" ? data[key] : undefined;
  const getStringArray = (key: string) => {
    const value = data[key];
    return Array.isArray(value)
      ? value.filter((item: unknown): item is string => typeof item === "string")
      : undefined;
  };

  return {
    ...data,
    isValidOem: typeof data.isValidOem === "boolean" ? data.isValidOem : undefined,
    isDraft: typeof data.isDraft === "boolean" ? data.isDraft : undefined,
    reason: getString("reason"),
    cleanOem: getString("cleanOem"),
    detectedOem: getString("detectedOem"),
    brand: getString("brand"),
    matchedCategoryId: getString("matchedCategoryId"),
    suggestedCategoryName: getString("suggestedCategoryName"),
    model: getString("model"),
    title: getString("title"),
    condition: getString("condition"),
    description: getString("description"),
    tags: getStringArray("tags"),
    metaTitle: getString("metaTitle"),
    metaDescription: getString("metaDescription"),
    metaKeywords: getString("metaKeywords"),
    crossReferences: getStringArray("crossReferences"),
    sources: Array.isArray(data.sources)
      ? data.sources.flatMap((source) => {
        if (!source || typeof source !== "object") return [];

        const sourceData = source as Record<string, unknown>;
        return typeof sourceData.title === "string" && typeof sourceData.url === "string"
          ? [{ title: sourceData.title, url: sourceData.url }]
          : [];
      })
      : undefined,
  };
}

/**
 * LLM'in ürettiği metinden JSON'u güvenle ayıklar ve ayrıştırır.
 * Tırnak içindeki ham satır sonlarını (\n, \r) ve tabları escape eder.
 */
export function parseLlmJson(rawText: string): OemAssistantData {
  let cleaned = rawText.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    cleaned = match[1].trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return normalizeOemAssistantData(JSON.parse(cleaned));
  } catch {
    let inString = false;
    let escaped = false;
    let result = "";

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (char === '"' && !escaped) {
        inString = !inString;
        result += char;
      } else if (inString && (char === "\n" || char === "\r")) {
        result += char === "\r" ? "" : "\\n";
      } else if (inString && char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }

      escaped = char === "\\" && !escaped;
    }

    try {
      return normalizeOemAssistantData(JSON.parse(result));
    } catch (parseErr: unknown) {
      const errorMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
      const posMatch = errorMessage.match(/at position (\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const sub = result.slice(0, pos);
        const lastValidBrace = sub.lastIndexOf("}");
        if (lastValidBrace !== -1) {
          return normalizeOemAssistantData(JSON.parse(sub.slice(0, lastValidBrace + 1)));
        }
      }
      throw parseErr;
    }
  }
}
