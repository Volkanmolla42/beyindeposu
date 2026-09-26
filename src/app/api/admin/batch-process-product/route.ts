import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import * as path from "path";
import * as fs from "fs";
import { mkdir, writeFile } from "fs/promises";
import {
  getVisionLookupSystemInstruction,
  formatCategoriesList,
  formatBrandsList,
  parseLlmJson,
  DEFAULT_GEMINI_MODELS,
} from "@/lib/ai/oem-assistant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY ortam değişkeni tanımlı değil." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const shelfCode = (formData.get("shelfCode") as string) || "GENEL";
    const categoryHint = (formData.get("categoryHint") as string) || "Oto Elektronik";
    const brandHint = (formData.get("brandHint") as string) || "Genel";
    const categoriesJson = (formData.get("categories") as string) || "[]";
    const brandsJson = (formData.get("brands") as string) || "[]";

    let categories: any[] = [];
    let brands: any[] = [];
    try {
      categories = JSON.parse(categoriesJson);
      brands = JSON.parse(brandsJson);
    } catch {
      // Fallback empty
    }

    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "İşlenecek görsel dosyası bulunamadı." },
        { status: 400 }
      );
    }

    // 1. Görselleri Sisteme Kaydet (public/uploads/products)
    const uploadDir = process.env.PRODUCT_UPLOAD_DIR
      ? path.resolve(process.env.PRODUCT_UPLOAD_DIR)
      : path.join(process.cwd(), "public", "uploads", "products");
    const publicBasePath = process.env.PRODUCT_UPLOAD_PUBLIC_PATH || "/uploads/products";

    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];
    const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];

    const cleanShelf = shelfCode.replace(/[^a-z0-9]/gi, "_");
    const timestamp = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || ".webp";
      const fileName = `product_${cleanShelf}_${timestamp}_${i + 1}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, buffer);
      uploadedUrls.push(`${publicBasePath}/${fileName}`);

      // İlk 4 görseli AI Vision analizi için hazırla
      if (i < 4) {
        const mimeType = file.type || (ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg");
        imageParts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType,
          },
        });
      }
    }

    // 2. Gemini Vision İle OEM Analizi Yap
    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = getVisionLookupSystemInstruction();
    const categoriesStr = formatCategoriesList(categories);
    const brandsStr = formatBrandsList(brands);

    const userPrompt = `Görsellerdeki oto elektronik parçasını ve üzerindeki etiketleri dikkatle incele.
Parçanın ön, arka veya yan tarafındaki tüm etiketlerdeki kodları oku, ana OEM numarasını ve üretici (Bosch, Continental, Delphi, Siemens, ATE, Autoliv vb.) kodlarını tespit et ve JSON çıktısını üret.

Klasör ve Dosya İpuçları:
- Raf/Stok Kodu: ${shelfCode}
- Tahmini Kategori: ${categoryHint}
- Tahmini Marka: ${brandHint}

SİSTEMDE KAYITLI KATEGORİLER:
${categoriesStr}

SİSTEMDE KAYITLI MARKALAR:
${brandsStr}`;

    const modelsToTry = DEFAULT_GEMINI_MODELS;
    let aiResponse: any = null;
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        aiResponse = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }, ...imageParts],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });
        if (aiResponse?.text) break;
      } catch (e: any) {
        lastErr = e;
      }
    }

    if (!aiResponse?.text) {
      throw new Error(`Yapay zeka analizi başarısız oldu: ${lastErr?.message || "Bilinmeyen hata"}`);
    }

    const parsedData = parseLlmJson(aiResponse.text);
    const oem = parsedData.detectedOem?.trim();
    const isDraft = !oem || oem === shelfCode || oem === "null" || oem === "İNCELEME GEREKLİ";
    const detectedOem = isDraft ? "İNCELEME GEREKLİ" : oem;
    const detectedTitle = isDraft
      ? `${parsedData.brand || brandHint} ${categoryHint} - Raf: ${shelfCode} (İNCELEME GEREKLİ)`
      : (parsedData.title || `${brandHint} ${detectedOem} Oto Elektronik Beyin`);

    return NextResponse.json({
      success: true,
      shelfCode,
      isDraft,
      oemNumber: detectedOem,
      title: detectedTitle,
      brand: parsedData.brand || brandHint,
      model: isDraft ? "" : (parsedData.model || "Genel Uyumlu"),
      condition: parsedData.condition || "Orijinal Çıkma",
      description: isDraft ? "" : (parsedData.description || ""),
      matchedCategoryId: parsedData.matchedCategoryId,
      suggestedCategoryName: parsedData.suggestedCategoryName,
      images: uploadedUrls,
      metaTitle: isDraft ? "" : (parsedData.metaTitle || detectedTitle.slice(0, 60)),
      metaDescription: isDraft ? "" : (parsedData.metaDescription || ""),
      metaKeywords: isDraft ? "" : (parsedData.metaKeywords || ""),
      tags: isDraft ? ["inceleme-gerekli", shelfCode] : (parsedData.tags || [detectedOem, shelfCode]),
    });
  } catch (error: any) {
    console.error("Batch process item error:", error);
    return NextResponse.json(
      { error: error?.message || "Ürün işlenirken beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
