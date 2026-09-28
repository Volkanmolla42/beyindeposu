import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";
import {
  getVisionLookupSystemInstruction,
  formatCategoriesList,
  formatBrandsList,
  parseLlmJson,
  DEFAULT_GEMINI_MODELS,
} from "@/lib/ai/oem-assistant";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminApiRequest(req);
  if (unauthorized) return unauthorized;

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

    const contentLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 14 * 1024 * 1024) {
      return NextResponse.json({ error: "Görsel en fazla 10 MB olabilir." }, { status: 413 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }
    const {
      imageBase64,
      imageMimeType = "image/jpeg",
      categories = [],
      brands = [],
    } = body as Record<string, unknown>;

    if (
      !imageBase64 ||
      typeof imageBase64 !== "string" ||
      imageBase64.length > 14 * 1024 * 1024 ||
      !Array.isArray(categories) ||
      !Array.isArray(brands) ||
      typeof imageMimeType !== "string" ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(imageMimeType)
    ) {
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

    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
    const modelsToTry = DEFAULT_GEMINI_MODELS;
    let lastError: unknown;

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
      } catch (error: unknown) {
        lastError = error;
      }
    }

    if (!response?.text) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Görsel analizi sırasında Gemini modelinden yanıt alınamadı.");
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
  } catch (error: unknown) {
    console.error("AI OEM from Image Error:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : undefined) ||
          "Fotoğraftan parça analizi yapılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz.",
      },
      { status: 500 }
    );
  }
}
