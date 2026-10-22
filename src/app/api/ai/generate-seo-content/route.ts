import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";
import { DEFAULT_GEMINI_MODELS } from "@/lib/ai/oem-assistant";
import { parseLlmJson } from "@/lib/ai/json-cleaner";

export interface GeneratedSeoContent {
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqs: Array<{ question: string; answer: string }>;
}

function parseJsonFromLlm(text: string): GeneratedSeoContent | null {
  const parsed = parseLlmJson<GeneratedSeoContent>(text);
  if (
    typeof parsed?.metaTitle === "string" &&
    typeof parsed?.metaDescription === "string" &&
    typeof parsed?.content === "string" &&
    Array.isArray(parsed?.faqs)
  ) {
    return parsed;
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
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      type?: "brand" | "category";
      name?: string;
      description?: string;
    };

    const type = body?.type === "category" ? "category" : "brand";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Marka veya kategori adı belirtilmelidir." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Sen "Beyin Deposu" (Türkiye'nin lider oto beyin, ECU, ABS, TCU şanzıman mekatroniği ve oto elektronik kontrol üniteleri merkezi) için çalışan kıdemli bir otomotiv elektronik mühendisi ve teknik SEO uzmanısın.

GÖREV:
Kullanıcının verdiği ${type === "brand" ? "araç markası" : "parça kategorisi"} için Google'da 1. sıraya çıkacak, öne çıkan pasaj (Featured Snippet) yakalayacak, arama niyetini (search intent) tam karşılayan ve kullanıcıyı doğrudan iletişime/siparişe yönlendiren 100/100 SEO uyumlu içerik paketi üretmek.

ZORUNLU KURALLAR (KESİNLİKLE İHLAL EDİLEMEZ):
1. ASLA EMOJİ KULLANMA (🚀, ⚡, 🔧, ✨ vb. kesinlikle yasaktır).
2. ASLA EM DASH (—) KULLANMA. Yerine virgül, iki nokta veya parantez kullan.
3. Klişe pazarlama edebiyatı ("Devrim niteliğinde", "En son teknolojiyle donatılmış") yazma. Gerçek saha ve atölye dili kullan (Bosch, Continental, Delphi, Siemens VDO, Marelli, Denso, DME, DDE, TCU, DSG, CAN-Bus, K-Line, EEPROM, MCU, pin-out, full klonlama, tak-çalıştır).
4. DÜZ PARAGRAF YIĞINI YAPMA. Okunabilirliği ve taranabilirliği (skimmability) artırmak için maddeli listeler (- **Kalın Başlık:** Açıklama) kullan.
5. ÇIKTI YALNIZCA GEÇERLİ BİR JSON OLMALIDIR. Markdown kod bloğu dışında hiçbir ek açıklama yazma.

İÇERİK YAPISI VE ŞABLONU (Markdown "content" alanı için):
- ## Genel Bakış ve Elektronik Mimari
  ${type === "brand" ? "Markanın" : "Kategorinin"} araçlardaki elektronik kontrol mimarisi, kullandığı mikroişlemci aileleri ve kontrol ünitelerinin araç yönetimindeki kritik rolü (1 kısa giriş paragrafı).

- ## Desteklenen Modül ve Donanım Aileleri
  Kullanılan popüler donanım serilerini mutlaka maddeler halinde listele:
  - **Motor Yönetim Üniteleri (ECU):** Popüler seriler (örn: Bosch EDC16 / EDC17, Delphi DCM, Continental SID vb.)
  - **Şanzıman ve Mekatronik (TCU):** Çift kavrama / otomatik kontrol üniteleri
  - **Fren ve Güvenlik Modülleri:** ABS/ESP hidrolik blokları ve elektronik kartları
  - **Gövde ve Konfor:** BCM, immobilizer ve gösterge paneli senkronizasyon üniteleri

- ## Sık Karşılaşılan Arıza Belirtileri ve Hata Kodları
  Kullanıcıların Google'da en çok arattığı kronik arızaları ve ilgili OBD-II hata kodlarını (DTC) maddeler halinde açıkla:
  - **İletişim ve Veri Yolu Kesintisi (U0100 vb.):** CAN-Bus iletişim kopukluğu, göstergede motor ışığı veya ünlem.
  - **Ateşleme ve Enjektör Sinyal Kaybı (P0300 vb.):** MOSFET/sürücü entegre yanması kaynaklı silindir teklemesi.
  - **Besleme ve Mikroişlemci Kilitlenmesi (P0606 vb.):** İç voltaj regülatörü ve lehim çatlağı arızaları.
  - **Mekatronik ve Basınç Kayıpları:** Vitese geçmeme, vuruntu veya şanzıman koruma modu.

- ## Test Laboratuvarı, Klonlama ve Güvence
  - **Masaüstü Simülasyon Testi:** Arızalı ünitenin HiL (Hardware-in-the-Loop) tezgahlarında araç simülasyonu ile test edilmesi.
  - **Full Clone (Tak-Çalıştır):** Orijinal yazılım, immobilizer ve kalibrasyon verilerinin yeni üniteye birebir aktarımı; araçta sıfırdan tanıtma/kodlama ihtiyacı olmadan montaj kolaylığı.
  - **12 Ay Servis Garantisi:** Tüm revizyonlu ve test edilmiş üniteler için 12 ay koşulsuz garanti desteği.

JSON ŞEMASI:
{
  "metaTitle": "Tıklama odaklı, 60 karakteri geçmeyen net SEO başlığı (Örn: Volkswagen Beyin Tamiri ve ECU Fiyatları | Beyin Deposu)",
  "metaDescription": "Arama niyetini hedefleyen, 150-160 karakter arası net meta açıklaması",
  "content": "Yukarıdaki şablona tam uyan, başlıkları ## olan, maddeli listeler (- **...:** ...) içeren zengin teknik Markdown metni",
  "faqs": [
    {
      "question": "Kullanıcıların Google'da en çok arattığı arıza/fiyat/işlem süresi odaklı teknik soru 1",
      "answer": "Net, açıklayıcı ve uzman gözüyle verilmiş 2-3 cümlelik yanıt"
    },
    {
      "question": "Kullanıcıların en çok merak ettiği klonlama/uyumluluk sorusu 2",
      "answer": "Net, açıklayıcı ve uzman gözüyle verilmiş 2-3 cümlelik yanıt"
    },
    {
      "question": "Garanti ve montaj süreciyle ilgili soru 3",
      "answer": "Net, açıklayıcı ve uzman gözüyle verilmiş 2-3 cümlelik yanıt"
    }
  ]
}`;

    const userPrompt = `Lütfen şu varlık için SEO içerik paketini üret:
Tür: ${type === "brand" ? "Araç Markası" : "Parça Kategorisi"}
Adı: "${name}"
${description ? `Mevcut Açıklama / Not: "${description}"` : ""}
`;

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
    let lastError: unknown;

    for (const model of DEFAULT_GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
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
      console.error("[generate-seo-content] LLM response could not be parsed:", rawText);
      return NextResponse.json(
        {
          error: "Yapay zeka yanıtı geçerli formatta üretilemedi.",
          raw: rawText,
          details: lastError instanceof Error ? lastError.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: unknown) {
    console.error("[generate-seo-content] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "SEO içeriği üretilirken beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
