import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price?: number): string {
  if (!price || price === 0) return "Fiyat Sorunuz";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);
}

export {
  cleanPhoneNumber,
  formatPhoneNumber,
  getWhatsAppUrl,
  type WhatsAppProductTarget,
  type WhatsAppTarget,
} from "./whatsapp";

import { getWhatsAppUrl } from "./whatsapp";

export function generateWhatsAppLink(
  phoneNumber: string,
  productTitle?: string,
  oemNumber?: string,
  customMessage?: string
): string {
  if (customMessage) {
    return getWhatsAppUrl({ message: customMessage }, phoneNumber);
  }
  if (productTitle) {
    return getWhatsAppUrl({ product: { title: productTitle, oemNumber } }, phoneNumber);
  }
  return getWhatsAppUrl(undefined, phoneNumber);
}

/**
 * Windows ZIP / Dosya sistemi (CP437, CP857, Windows-1254) kaynaklı
 * bozulmuş Türkçe karakterleri (mojibake) ve kutu çizim sembollerini onarır/temizler.
 */
export function sanitizeTurkishText(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Bilinen UTF-8 -> Latin1/Windows-1252 Mojibake düzeltmeleri
  const mojibakeMap: Record<string, string> = {
    "Ã§": "ç", "Ã‡": "Ç",
    "Ã¶": "ö", "Ã–": "Ö",
    "Ã¼": "ü", "Ãœ": "Ü",
    "ÄŸ": "ğ", "Äž": "Ğ",
    "ÅŸ": "ş", "Åž": "Ş",
    "Ä±": "ı", "Ä°": "İ",
    "â€™": "'", "â€œ": '"', "â€": '"', "â€“": "-",
  };

  for (const [bad, good] of Object.entries(mojibakeMap)) {
    cleaned = cleaned.replaceAll(bad, good);
  }

  // 2. Windows CP437 ZIP ayıklama bozulmaları (Örn: C╞gal╞ s╞gt─ rma -> Çalıştırma)
  cleaned = cleaned
    .replace(/C[╞\u255E\u2560\u255F]gal[╞\u255E\u2560\u255F]\s*s[╞\u255E\u2560\u255F]gt[─\u2500\u2501]\s*rma/gi, "Çalıştırma")
    .replace(/[╞\u255E\u2560\u255F]gal/gi, "al")
    .replace(/[╞\u255E\u2560\u255F]\s*s/gi, "ş")
    .replace(/[╞\u255E\u2560\u255F]gt/gi, "t")
    .replace(/s[╞\u255E\u2560\u255F]/gi, "ş")
    .replace(/C[╞\u255E\u2560\u255F]/gi, "Ç")
    .replace(/c[╞\u255E\u2560\u255F]/gi, "ç")
    .replace(/[─\u2500\u2501]rma/gi, "ırma")
    .replace(/[─\u2500\u2501]/g, "ı");

  // 3. Kalan DOS/ANSI kutu çizim karakterlerini (U+2500 - U+259F) ve anlamsız glifleri temizle
  cleaned = cleaned.replace(/[\u2500-\u259F\uFFFD]/g, "");

  // 4. Çift boşlukları ve baştaki/sondaki gereksiz karakterleri toparla
  return cleaned.replace(/\s+/g, " ").trim();
}

