import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  getTextLookupSystemInstruction,
  formatCategoriesList,
  formatBrandsList,
  parseLlmJson,
  DEFAULT_GEMINI_MODELS,
} from "@/lib/ai/oem-assistant";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen projenizin .env.local dosyasına geçerli bir GEMINI_API_KEY ekleyin.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { oemNumber, categories = [], brands = [] } = body;

    const trimmedOem = typeof oemNumber === "string" ? oemNumber.trim() : "";
    if (!trimmedOem) {
      return NextResponse.json(
        { error: "Lütfen geçerli bir OEM veya parça kodu giriniz." },
        { status: 400 }
      );
    }

    const categoriesListStr = formatCategoriesList(categories);
    const brandsListStr = formatBrandsList(brands);

    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = getTextLookupSystemInstruction();

    const userPrompt = `Aşağıdaki OEM / parça kodunu 4 aşamalı mimari ile analiz et ve JSON verisini üret:
OEM Kodu: "${trimmedOem}"

SİSTEMDE KAYITLI KATEGORİLER:
${categoriesListStr}

SİSTEMDE KAYITLI MARKALAR:
${brandsListStr}
`;

    let response: any;
    const modelsToTry = DEFAULT_GEMINI_MODELS;
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: systemPrompt,
              tools: [{ googleSearch: {} }],
              temperature: 0.2,
            },
          });
        } catch {
          // Search grounding quota or tool restriction fallback
          response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.2,
            },
          });
        }

        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!response?.text) {
      throw lastError || new Error("Gemini modelinden yanıt alınamadı.");
    }

    // Google Search Grounding kaynaklarını ayıkla
    const sources: Array<{ title: string; url: string }> = [];
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    const parsedData = parseLlmJson(response.text || "");

    if (parsedData.isValidOem === false) {
      return NextResponse.json(
        {
          isValidOem: false,
          error:
            parsedData.reason ||
            `"${trimmedOem}" kodu geçerli bir otomotiv OEM parça numarası olarak doğrulanamadı. Lütfen parça kodunu kontrol ediniz.`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...parsedData,
      sources,
    });
  } catch (err: any) {
    console.error("AI OEM Lookup Error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "OEM analizi yapılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
