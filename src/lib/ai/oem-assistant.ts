/**
 * OEM Assistant Centralized Module (Single Source of Truth)
 * 
 * Bu modül; hem metin tabanlı (oem-lookup) hem de görsel/etiket tabanlı (oem-from-image)
 * yapay zeka entegrasyonlarının kullandığı sistem promptlarını, 100/100 SEO açıklama
 * şablonunu, JSON şemalarını ve LLM yanıt ayrıştırıcısını tek bir merkezde toplar.
 */

export const SEO_DESCRIPTION_MARKDOWN_TEMPLATE = `AŞAĞIDAKİ 100/100 SEO UYUMLU ŞABLONA BİREBİR UYGUN MARKDOWN FORMATINDA OLUŞTURULMALIDIR:

## [OEM No] [Marka] [Parça Tam Adı]

[Parçanın ne olduğu, araçtaki temel işlevi, motor havuzundaki veya araç içindeki konumu ve teknik mimarisi hakkında hem bitişik hem boşluklu OEM kodunu içeren 2-3 cümlelik SEO odaklı akıcı giriş paragrafı]

## Ürün Bilgileri
- **Ürün:** [Ürün tam adı ve mimari/seri bilgisi (Örn: ABS Fren Beyni Kontrol Ünitesi veya Motor Beyni ECU veya Konfor Modülü)]
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
Satışa sunulan bu ürün orijinal çıkma parça olup soket tırnakları, pin bağlantıları ve gövdesi kontrol edilmiştir. Montaj işlemi sonrası gerekli adaptasyon, tanıtma/kodlama ve diyagnostik cihazı ile sistem arıza hafızasının silinmesi uzman servislerce yapılmalıdır.

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
  "title": "SEO ve pazar yeri uyumlu ürün başlığı (Örn: VW Sharan Ford Galaxy Merkezi Kilit Konfor Beyni 7M3962258L)",
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
1. Görseldeki etiketi veya parça kabartmasını incele. Etikette yazan tüm üretici kodlarını, parça numaralarını ve barkodları oku.
2. Ana araç üreticisi OEM parça numarasını (Örn: VAG grubu için 7M3962258L, 8K0..., BMW için 11 haneli kod, Mercedes için A..., Bosch için 0281... vb.) tespit et.
3. Eğer görselde bir otomotiv parçası yoksa veya etiket okunamaz/tanınamaz durumdaysa "isValidOem: false" dön ve nedenini açıkla.
4. Parça geçerliyse otomotiv külliyatından ve kataloglardan yararlanarak 100/100 SEO uyumlu ürün bilgilerini eksiksiz üret.

ÇIKTI FORMATI:
SADECE aşağıdaki JSON nesnesini dön. Markdown kod bloğu haricinde hiçbir ek metin yazma:

Eğer görselde otomotiv parça etiketi veya OEM kodu bulunamazsa:
{
  "isValidOem": false,
  "reason": "Yüklenen görsel üzerinde okunabilir bir otomotiv parça veya OEM numarası tespit edilemedi. Lütfen parçanın üzerindeki etiketin net bir fotoğrafını yükleyiniz."
}

Eğer geçerli bir parça tespit edilirse:
${COMMON_JSON_OUTPUT_SCHEMA}`;
}

/**
 * Kategori listesini prompt için metne dönüştürür
 */
export function formatCategoriesList(categories: any[] = []): string {
  if (!Array.isArray(categories) || categories.length === 0) {
    return "Kategori listesi verilmedi.";
  }
  return categories
    .map(
      (c: any) =>
        `- ID: ${c._id || c.id}, Kategori Adı: "${c.name}", Slug: "${c.slug || ""}"`
    )
    .join("\n");
}

/**
 * Marka listesini prompt için metne dönüştürür
 */
export function formatBrandsList(brands: any[] = []): string {
  if (!Array.isArray(brands) || brands.length === 0) {
    return "Marka listesi verilmedi.";
  }
  return brands.map((b: any) => (typeof b === "string" ? b : b.name)).join(", ");
}

/**
 * LLM'in ürettiği metinden JSON'u güvenle ayıklar ve ayrıştırır.
 * Tırnak içindeki ham satır sonlarını (\n, \r) ve tabları escape eder.
 */
export function parseLlmJson(rawText: string): any {
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
    return JSON.parse(cleaned);
  } catch (initialErr) {
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

    return JSON.parse(result);
  }
}
