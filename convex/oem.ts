"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { GoogleGenAI } from "@google/genai";
import {
  getTextLookupSystemInstruction,
  formatCategoriesList,
  formatBrandsList,
  parseLlmJson,
} from "../src/lib/ai/oem-assistant";

type LookupOemResult =
  | {
      success: true;
      isValidOem: true;
      cleanOem: string;
      brand: string;
      matchedCategoryId?: Id<"categories">;
      suggestedCategoryName?: string;
      model: string;
      title: string;
      condition: string;
      description: string;
      tags: string[];
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string;
      crossReferences: string[];
      sources: Array<{ title: string; url: string }>;
    }
  | {
      success: false;
      isValidOem: false;
      error: string;
    };

export const lookupOem = action({
  args: {
    oemNumber: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      isValidOem: v.literal(true),
      cleanOem: v.string(),
      brand: v.string(),
      matchedCategoryId: v.optional(v.id("categories")),
      suggestedCategoryName: v.optional(v.string()),
      model: v.string(),
      title: v.string(),
      condition: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
      metaTitle: v.string(),
      metaDescription: v.string(),
      metaKeywords: v.string(),
      crossReferences: v.array(v.string()),
      sources: v.array(
        v.object({
          title: v.string(),
          url: v.string(),
        })
      ),
    }),
    v.object({
      success: v.literal(false),
      isValidOem: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args): Promise<LookupOemResult> => {
    const apiKey = args.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        isValidOem: false,
        error:
          "GEMINI_API_KEY bulunamadı. Lütfen Convex ortam değişkenlerine (npx convex env set GEMINI_API_KEY ...) veya .env.local dosyasına GEMINI_API_KEY ekleyin.",
      };
    }

    const trimmedOem = args.oemNumber.trim();
    if (!trimmedOem) {
      return {
        success: false,
        isValidOem: false,
        error: "Lütfen geçerli bir OEM veya parça kodu giriniz.",
      };
    }

    // Query categories and brands directly from Convex database via ctx.runQuery
    const categories: Array<{ _id: Id<"categories">; name: string; slug: string }> =
      (await ctx.runQuery(api.categories.list, { onlyActive: false })) as any;
    const brands: Array<{ name: string }> = (await ctx.runQuery(api.brands.list, {})) as any;

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
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-3.7-flash"];
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
      return {
        success: false,
        isValidOem: false,
        error: lastError?.message || "Gemini modelinden yanıt alınamadı.",
      };
    }

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const sources: Array<{ title: string; url: string }> = [];

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    let parsedData: any;
    try {
      parsedData = parseLlmJson(response.text || "");
    } catch {
      return {
        success: false,
        isValidOem: false,
        error: "Yapay zeka çıktısı geçerli bir JSON formatına dönüştürülemedi.",
      };
    }

    if (parsedData.isValidOem === false) {
      return {
        success: false,
        isValidOem: false,
        error:
          parsedData.reason ||
          `"${trimmedOem}" kodu geçerli bir otomotiv OEM parça numarası olarak doğrulanamadı.`,
      };
    }

    // Verify if returned matchedCategoryId really exists in categories table
    let validCatId: Id<"categories"> | undefined = undefined;
    if (parsedData.matchedCategoryId && categories) {
      const exists = categories.find((c) => c._id === parsedData.matchedCategoryId);
      if (exists) {
        validCatId = exists._id;
      }
    }

    return {
      success: true,
      isValidOem: true,
      cleanOem: String(parsedData.cleanOem || trimmedOem),
      brand: String(parsedData.brand || "Genel Uyumlu"),
      matchedCategoryId: validCatId,
      suggestedCategoryName: parsedData.suggestedCategoryName
        ? String(parsedData.suggestedCategoryName)
        : undefined,
      model: String(parsedData.model || ""),
      title: String(parsedData.title || trimmedOem),
      condition: String(parsedData.condition || "Orijinal Çıkma"),
      description: String(parsedData.description || ""),
      tags: Array.isArray(parsedData.tags) ? parsedData.tags.map(String) : [],
      metaTitle: String(parsedData.metaTitle || ""),
      metaDescription: String(parsedData.metaDescription || ""),
      metaKeywords: String(parsedData.metaKeywords || ""),
      crossReferences: Array.isArray(parsedData.crossReferences)
        ? parsedData.crossReferences.map(String)
        : [],
      sources,
    };
  },
});
