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

export function generateWhatsAppLink(
  phoneNumber: string,
  productTitle?: string,
  oemNumber?: string,
  customMessage?: string
): string {
  let cleanPhone = (phoneNumber || "").replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = "9" + cleanPhone;
  } else if (cleanPhone.length === 10 && cleanPhone.startsWith("5")) {
    cleanPhone = "90" + cleanPhone;
  }

  let message = "";
  if (customMessage) {
    message = customMessage;
  } else if (productTitle && oemNumber) {
    message = `Merhaba Beyin Deposu, web sitenizden ${productTitle} (OEM No: ${oemNumber}) ürünü hakkında bilgi ve fiyat almak istiyorum. Stok durumu nedir?`;
  } else if (productTitle) {
    message = `Merhaba Beyin Deposu, web sitenizden ${productTitle} hakkında bilgi almak istiyorum.`;
  } else {
    message = `Merhaba Beyin Deposu, oto elektronik parça talebinde bulunmak istiyorum.`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

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
