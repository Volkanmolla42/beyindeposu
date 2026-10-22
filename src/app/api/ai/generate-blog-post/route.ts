import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";
import { DEFAULT_GEMINI_MODELS } from "@/lib/ai/oem-assistant";
import { parseLlmJson } from "@/lib/ai/json-cleaner";

export interface GeneratedBlogPost {
  title: string;
  excerpt: string;
  category: string;
  isNewCategory: boolean;
  tags: string[];
  content: string;
  faqs: Array<{ question: string; answer: string }>;
}

function parseJsonFromLlm(text: string): GeneratedBlogPost | null {
  const parsed = parseLlmJson<Record<string, unknown>>(text);
  if (
    typeof parsed?.title === "string" &&
    typeof parsed?.excerpt === "string" &&
    typeof parsed?.category === "string" &&
    typeof parsed?.content === "string" &&
    Array.isArray(parsed?.tags) &&
    Array.isArray(parsed?.faqs)
  ) {
      return {
        title: parsed.title.trim(),
        excerpt: parsed.excerpt.trim(),
        category: parsed.category.trim(),
        isNewCategory: Boolean(parsed.isNewCategory),
        tags: parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean),
        content: parsed.content.trim(),
        faqs: parsed.faqs
          .filter(
            (f: unknown) =>
              f &&
              typeof f === "object" &&
              typeof (f as { question?: unknown }).question === "string" &&
              typeof (f as { answer?: unknown }).answer === "string",
          )
          .map((f: { question: string; answer: string }) => ({
            question: f.question.trim(),
            answer: f.answer.trim(),
          })),
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
      topic?: string;
      existingCategories?: string[];
    };

    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const existingCategories = Array.isArray(body?.existingCategories)
      ? body.existingCategories.map((c) => String(c).trim()).filter(Boolean)
      : [];

    if (!topic) {
      return NextResponse.json(
        { error: "Lütfen bir blog konusu veya anahtar kelime belirtin." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Sen "Beyin Deposu" (Türkiye'nin önde gelen oto beyin, ECU, ABS, TCU şanzıman mekatroniği ve oto elektronik kontrol üniteleri merkezi) için çalışan kıdemli bir otomotiv elektronik mühendisi ve teknik SEO yazarısın.

GÖREV:
Kullanıcının verdiği konu veya anahtar kelime için Google'da 1. sıraya çıkacak, öne çıkan pasaj (Featured Snippet) yakalayacak, arama niyetini (search intent) tam karşılayan ve kullanıcıyı doğrudan servise/siparişe yönlendiren 100/100 SEO uyumlu, eksiksiz bir blog yazısı paketi üretmek.

ZORUNLU KURALLAR (KESİNLİKLE İHLAL EDİLEMEZ):
1. ASLA EMOJİ KULLANMA (🚀, ⚡, 🔧, ✨ vb. kesinlikle yasaktır).
2. ASLA EM DASH (—) KULLANMA. Yerine virgül, iki nokta veya parantez kullan.
3. Klişe pazarlama edebiyatı ("Devrim niteliğinde", "En son teknolojiyle donatılmış") yazma. Gerçek saha ve atölye dili kullan (Bosch, Continental, Delphi, Siemens VDO, Marelli, Denso, DME, DDE, TCU, DSG, CAN-Bus, K-Line, EEPROM, MCU, pin-out, full klonlama, tak-çalıştır).
4. DÜZ PARAGRAF YIĞINI YAPMA. Okunabilirliği ve taranabilirliği (skimmability) artırmak için maddeli listeler (- **Kalın Başlık:** Açıklama) kullan.
5. KATEGORİ SEÇİMİ KURALI:
   Mevcut kategoriler listesi verilecek. Eğer konu bu kategorilerden birine tam oturuyorsa onu seç ve isNewCategory: false yap. Eğer hiçbir mevcut kategori konuyu karşılamıyorsa, 2-3 kelimelik net yeni bir kategori adı öner ve isNewCategory: true yap.
6. TEKNİK KARŞILAŞTIRMA TABLOSU (ZORUNLU): "content" alanı içinde mutlaka konuya tam uyan 1 adet Markdown formatında 3-4 sütunlu karşılaştırma tablosu (Örn: Çözüm Yolu | Ortalama Maliyet | Dayanım | Kodlama Durumu veya Arıza Kodu | Muhtemel Bileşen | Çözüm Adımı) yer almalıdır.
7. NET EYLEME ÇAĞRI (CALL TO ACTION): "content" alanının en sonunda "## Teknik Destek ve Parça Temini" başlığı altında, araç sahibini şasi numarası (VIN) ile Beyin Deposu uzmanlarına danışarak garantili parça ve revizyon desteği almaya davet eden net, samimi, abartısız bir eyleme çağrı bulunmalıdır.
8. ÇIKTI YALNIZCA GEÇERLİ BİR JSON OLMALIDIR. Markdown kod bloğu dışında hiçbir ek açıklama yazma.

İÇERİK YAPISI VE ŞABLONU (Markdown "content" alanı için):
- ## Genel Bakış ve Elektronik Mimari
  Konunun araçtaki önemi, ilgili kontrol ünitesinin yapısı ve işlevi.
- ## İlgili Donanım Aileleri ve Modeller
  Maddeli liste halinde donanım serileri (Örn: Bosch EDC16, EDC17, DSG DQ200 vb.).
- ## Sık Karşılaşılan Arıza Belirtileri ve OBD Hata Kodları (DTC)
  Gerçek arıza kodları (örn: P0300, P0606, U0100, P17BF vb.) ile kullanıcıların arattığı belirtiler (- **Kod veya Belirti:** Açıklama).
- ## Çözüm Yolları ve Karşılaştırma
  Markdown formatında net ve okunaklı bir teknik karşılaştırma tablosu.
- ## Laboratuvar Teşhisi, Onarım ve Full Clone Güvencesi
  HiL masaüstü simülasyon test tezgahı, Full Clone tak-çalıştır yazılım transferi ve 12 ay garanti güvencesi.
- ## Teknik Destek ve Parça Temini
  Şasi numarasıyla parça sorgulama, doğru beyin tespiti ve Beyin Deposu uzmanlarına ulaşma çağrısı.

JSON ŞEMASI:
{
  "title": "Tıklama odaklı, 60 karakteri geçmeyen net SEO başlığı",
  "excerpt": "Arama motorları için 140-160 karakter arası net özet",
  "category": "Seçilen veya yeni önerilen kategori adı",
  "isNewCategory": true / false,
  "tags": ["etiket1", "etiket2", "etiket3", "etiket4"],
  "content": "Yukarıdaki şablona tam uyan, başlıkları ## olan, maddeli listeler, 1 adet Markdown tablosu ve CTA içeren zengin teknik Markdown metni",
  "faqs": [
    {
      "question": "Kullanıcıların Google'da en çok arattığı teknik soru 1",
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

    const userPrompt = `Lütfen şu konu için blog yazısı paketini üret:
Konu / Odak: "${topic}"
Mevcut Sistem Kategorileri: ${existingCategories.length > 0 ? existingCategories.join(", ") : "Henüz kategori yok"}
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
      console.error("[generate-blog-post] LLM response could not be parsed:", rawText);
      return NextResponse.json(
        {
          error: "Yapay zeka yanıtı geçerli formatta üretilemedi.",
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
    console.error("[generate-blog-post] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Blog yazısı üretilirken beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}
