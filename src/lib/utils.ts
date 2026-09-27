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

