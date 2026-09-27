import { SITE_CONTACT } from "@/config/site";

export interface WhatsAppProductTarget {
  title: string;
  oemNumber?: string;
  action?: "price" | "info" | "price_and_stock";
}

export type WhatsAppTarget =
  | { product: WhatsAppProductTarget }
  | { message: string }
  | { oemNumber: string }
  | undefined;

/**
 * Normalizes phone numbers to standard WhatsApp format with country code (90...).
 */
export function cleanPhoneNumber(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[^0-9]/g, "");
  if (clean.startsWith("0") && clean.length === 11) {
    clean = "9" + clean;
  } else if (clean.length === 10 && clean.startsWith("5")) {
    clean = "90" + clean;
  }
  return clean;
}

/**
 * Formats phone number for display (e.g. 0534 065 32 22).
 */
export function formatPhoneNumber(phoneNumber?: string): string {
  if (!phoneNumber) return "";
  const cleaned = phoneNumber.replace(/[^0-9]/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("90")) {
    const p = cleaned.slice(2);
    return `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8, 10)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  if (cleaned.length === 10) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  return phoneNumber;
}

/**
 * Deep module interface for generating WhatsApp direct-action links.
 * Hides greeting templates, phone formatting, and URL encoding behind a simple intent object.
 */
export function getWhatsAppUrl(
  target?: WhatsAppTarget,
  phoneNumber: string = SITE_CONTACT.whatsappNumber
): string {
  const clean = cleanPhoneNumber(phoneNumber);
  let message = "";

  if (!target) {
    message = "Merhaba Beyin Deposu, oto elektronik parça talebinde bulunmak istiyorum.";
  } else if ("message" in target && target.message) {
    message = target.message;
  } else if ("oemNumber" in target && target.oemNumber) {
    message = `Merhaba Beyin Deposu, ${target.oemNumber} OEM kodlu parça hakkında bilgi ve fiyat almak istiyorum.`;
  } else if ("product" in target && target.product) {
    const { title, oemNumber, action } = target.product;
    if (action === "price_and_stock") {
      message = oemNumber
        ? `Merhaba, ${oemNumber} kodlu ${title} için fiyat ve stok bilgisi alabilir miyim?`
        : `Merhaba, ${title} için fiyat ve stok bilgisi alabilir miyim?`;
    } else if (action === "price") {
      message = oemNumber
        ? `Merhaba, ${oemNumber} kodlu ${title} hakkında fiyat bilgisi alabilir miyim?`
        : `Merhaba, ${title} hakkında fiyat bilgisi alabilir miyim?`;
    } else {
      message = oemNumber
        ? `Merhaba Beyin Deposu, web sitenizden ${title} (OEM No: ${oemNumber}) ürünü hakkında bilgi ve fiyat almak istiyorum. Stok durumu nedir?`
        : `Merhaba Beyin Deposu, web sitenizden ${title} hakkında bilgi almak istiyorum.`;
    }
  } else {
    message = "Merhaba Beyin Deposu, oto elektronik parça talebinde bulunmak istiyorum.";
  }

  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}
