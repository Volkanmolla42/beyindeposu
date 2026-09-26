import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  getVisionLookupSystemInstruction,
  formatCategoriesList,
  formatBrandsList,
  parseLlmJson,
} from "@/lib/ai/oem-assistant";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen .env.local dosyanıza geçerli bir GEMINI_API_KEY ekleyin.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { imageBase64, imageMimeType = "image/jpeg", categories = [], brands = [] } = body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { error: "Lütfen analiz edilecek bir görsel yükleyiniz." },
        { status: 400 }
      );
    }

    // Strip data URI prefix if provided (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");

    const categoriesListStr = formatCategoriesList(categories);
    const brandsListStr = formatBrandsList(brands);

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = getVisionLookupSystemInstruction();

    const userPrompt = `Görseldeki parçayı ve etiketini dikkatle incele. Tüm kodları oku, ana OEM numarasını tespit et ve JSON çıktısını üret.

SİSTEMDE KAYITLI KATEGORİLER:
${categoriesListStr}

SİSTEMDE KAYITLI MARKALAR:
${brandsListStr}`;

    let response: any;
    // For vision, try gemini-3.7-flash first (best vision reasoning), then fallback to gemini-3.5-flash-lite
    const modelsToTry = ["gemini-3.7-flash", "gemini-3.5-flash-lite"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: cleanBase64,
                  },
                },
                { text: userPrompt },
              ],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        });

        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!response?.text) {
      throw lastError || new Error("Görsel analizi sırasında Gemini modelinden yanıt alınamadı.");
    }

    const parsedData = parseLlmJson(response.text || "");

    if (parsedData.isValidOem === false) {
      return NextResponse.json(
        {
          isValidOem: false,
          error:
            parsedData.reason ||
            "Yüklenen görsel üzerinde geçerli bir otomotiv parça numarası tespit edilemedi.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...parsedData,
    });
  } catch (err: any) {
    console.error("AI OEM from Image Error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Fotoğraftan parça analizi yapılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
