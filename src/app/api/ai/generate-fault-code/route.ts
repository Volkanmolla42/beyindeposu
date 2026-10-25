import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";
import { DEFAULT_GEMINI_MODELS } from "@/lib/ai/oem-assistant";
import { parseLlmJson } from "@/lib/ai/json-cleaner";

export interface GeneratedFaultCodeContent {
  title: string;
  description: string;
}

function parseJsonFromLlm(text: string): GeneratedFaultCodeContent | null {
  const parsed = parseLlmJson<GeneratedFaultCodeContent>(text);
  if (
    typeof parsed?.title === "string" &&
    parsed.title.trim().length > 0 &&
    typeof parsed?.description === "string" &&
    parsed.description.trim().length > 0
  ) {
    return {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminApiRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY ortam değişkeni tanımlı değil." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as {
      code?: string;
      title?: string;
    };

    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const existingTitle = typeof body?.title === "string" ? body.title.trim() : "";

    if (!code) {
      return NextResponse.json(
        { error: "Lütfen geçerli bir OBD-II arıza kodu belirtin (Örn: P0100, P0420, U0100)." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Sen "Beyin Deposu" (Türkiye'nin lider oto beyin, ECU, ABS, TCU şanzıman mekatroniği ve otomotiv diagnostik merkezi) için çalışan kıdemli bir otomotiv elektronik mühendisi ve teknik SEO uzmanısın.

GÖREV:
Verilen OBD-II arıza kodu için Google'da 1. sıraya çıkacak, öne çıkan pasaj (Featured Snippet) yakalayacak, arama niyetini (search intent) tam karşılayan ve kullanıcıyı hem bilgilendirip hem de gerekirse Beyin Deposu profesyonel çözümlerine yönlendiren 100/100 teknik SEO rehberi üretmek.

ZORUNLU KURALLAR (KESİNLİKLE İHLAL EDİLEMEZ):
1. ASLA EMOJİ KULLANMA (🚀, ⚡, 🔧, ✨ vb. kesinlikle yasaktır).
2. ASLA EM DASH (—) KULLANMA. Yerine iki nokta, virgül veya parantez kullan.
3. Klişe reklam ve yüzeysel yapay zeka edebiyatı ("Devrim niteliğinde", "Son teknoloji") KESİNLİKLE KULLANILMAYACAK.
4. Gerçek atölye ve diagnostik mühendisliği dili kullan: CAN-Bus, K-Line, 5V sensör referans voltajı, şase hattı, osiloskop sinyali, multimetre direnç testi, ECU/TCU iç sürücü entegresi (driver IC), MOSFET, lehim çatlağı, canlı veri (Live Data), limp mode vb.
5. "title" alanı: Kodun Türkçe endüstri standardı ve yetkili/özel servis cihazlarındaki net resmi karşılığı olmalıdır (Örn: "Hava Akış Sensörü (MAF) Devresi Aralık/Performans Arızası").
6. "description" alanı: AŞAĞIDAKİ 6 BÖLÜMLÜK ZENGİN MARKDOWN ŞABLONUNA BİREBİR UYMALIDIR:

### {KOD} Arıza Kodu Nedir? (Hızlı Tanı)
[İlk 40-50 kelimede Google Featured Snippet yakalamak üzere doğrudan, net tanım. Kontrol ünitesinin hangi sınır aşıldığında bu kodu hafızaya aldığının teknik açıklaması.]

---

### Sürüş Güvenliği ve Aciliyet Seviyesi
* **Kritiklik Seviyesi:** [Düşük / Orta / Yüksek / Kritik]
* **Araç Bu Şekilde Kullanılabilir mi?:** [Sürüş riski, yolda kalma ihtimali veya motorda kalıcı hasar oluşma tehlikesi hakkında net uyarı]
* **TÜVTÜRK Muayenesinden Geçer mi?:** [Emisyon ve göstergedeki ikaz lambası nedeniyle muayene durumu]

---

### En Sık Görüldüğü Popüler Araçlar ve Motorlar
[Türkiye pazarında bu arızanın kronikleştiği 3-4 marka ve model/motor ailesi. Örn: Opel Astra 1.3 CDTI, Ford Focus 1.6 TDCi, Fiat Egea 1.3 Multijet, VW Golf 1.6 TDI vb.]
* **[Marka 1]:** [Model ve motorlar]
* **[Marka 2]:** [Model ve motorlar]
* **[Marka 3]:** [Model ve motorlar]

---

### Belirtiler ve Sürücü Şikayetleri
* **[Belirti 1 - Kalın]:** Açıklama
* **[Belirti 2 - Kalın]:** Açıklama
* **[Belirti 3 - Kalın]:** Açıklama
* **[Belirti 4 - Kalın]:** Açıklama

---

### Olası Nedenler (Sensör, Tesisat ve Beyin)
1. **Sensör / Parça Arızası:** [Sensörün iç hasarı, kirlenmesi veya aşınması]
2. **Kablo Tesisatı ve Soketler:** [5V besleme, şase kopukluğu, gevşek pin veya oksitlenme]
3. **Mekanik / Kaçak Durumları:** [Hava/vakum kaçağı, basınç kaybı vb.]
4. **Motor / Şanzıman Beyni (ECU / TCU) Hatası:** [Yeni parça takılmasına rağmen arızanın silinmemesi, kart üzerindeki sürücü entegre veya lehim çatlağı durumu]

---

### Adım Adım Teşhis ve Doğru Onarım Sırası
1. **Arıza Tespit Cihazı ile Canlı Veri Analizi:** [Hangi parametrelerin inceleneceği]
2. **Fiziksel ve Tesisat Ölçümleri:** [Multimetre / osiloskop ile voltaj ve hat kontrolü]
3. **Parça Onarımı veya Değişimi:** [Doğru parça seçimi ve kalibrasyon]
4. **Beyin Deposu Test ve Onarım Çözümü:** [Sensör sağlam olmasına rağmen kod silinmiyorsa kontrol ünitesinin masaüstü simülasyon testine alınması ve donanımsal tamiri]

---

### Sıkça Sorulan Sorular (SSS)
* **Soru: [Kullanıcının Google'da bu kodla ilgili en çok arattığı soru 1]**
  * Cevap: [Net, tatmin edici ve teknik yanıt]
* **Soru: [Kullanıcının bu kodla ilgili en çok arattığı soru 2]**
  * Cevap: [Net, tatmin edici ve teknik yanıt]

7. ÇIKTI YALNIZCA GEÇERLİ BİR JSON OLMALIDIR. Markdown kod bloğu dışında hiçbir ek metin yazma.

JSON ŞEMASI:
{
  "title": "Doğru Türkçe arıza başlığı",
  "description": "Yukarıdaki 6 ana bölümlü, Markdown başlıkları (###), maddeli listeleri ve SSS alanını içeren teknik SEO rehberi"
}`;

    const userPrompt = `OBD-II Arıza Kodu: "${code}"
${existingTitle ? `Kullanıcının girdiği taslak başlık: "${existingTitle}"` : ""}

Lütfen bu arıza kodu için Türkiye otomotiv pazarına tam uyumlu, Featured Snippet ve arama niyetini karşılayan eksiksiz teknik SEO JSON paketini oluştur.`;

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
    let lastError: unknown;

    for (const model of DEFAULT_GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        });
        if (response?.text) break;
      } catch (err) {
        lastError = err;
      }
    }

    const rawText = response?.text?.trim() || "";
    const parsedData = parseJsonFromLlm(rawText);

    if (!parsedData) {
      console.error("[generate-fault-code] LLM response parsing failed:", rawText);
      return NextResponse.json(
        {
          error: "Yapay zeka yanıtı geçerli arıza kodu formatında üretilemedi.",
          raw: rawText,
          details: lastError instanceof Error ? lastError.message : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: unknown) {
    console.error("[generate-fault-code] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Arıza kodu içeriği üretilirken beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}
