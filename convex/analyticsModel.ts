import { v, type Infer } from "convex/values";

export const CONSENT_VERSION = "2026-10-01";
export const DAY = 86_400_000;
export const RAW_RETENTION = 90 * DAY;
export const SUMMARY_RETENTION = 400 * DAY;
export const eventNames = ["page_view", "product_view", "search", "search_result_click", "filter_change", "catalog_page", "whatsapp_click", "phone_click", "email_click", "chat_open", "chat_start", "chat_message", "image_view", "image_zoom", "oem_copy", "product_share", "engagement"] as const;
export const eventName = v.union(...eventNames.map((name) => v.literal(name)));
function isEventName(input: unknown): input is typeof eventNames[number] {
  return typeof input === "string" && eventNames.some((name) => name === input);
}
export const analyticsEvent = v.object({
  id: v.string(),
  name: eventName,
  path: v.string(),
  value: v.optional(v.string()),
  resultCount: v.optional(v.number()),
  number: v.optional(v.number()),
});
export type AnalyticsEvent = Infer<typeof analyticsEvent>;
export const deviceValidator = v.union(v.literal("mobile"), v.literal("tablet"), v.literal("desktop"));
export const metricsValidator = v.object({ visitors: v.number(), sessions: v.number(), pageViews: v.number(), productViews: v.number(), searches: v.number(), emptySearches: v.number(), contacts: v.number(), activeMs: v.number(), events: v.number() });
export type Metrics = Infer<typeof metricsValidator>;
export const emptyMetrics = (): Metrics => ({ visitors: 0, sessions: 0, pageViews: 0, productViews: 0, searches: 0, emptySearches: 0, contacts: 0, activeMs: 0, events: 0 });
export const breakdownKinds = ["page", "product", "product_contact", "search", "empty_search", "event", "source", "device", "filter"] as const;
export const breakdownKind = v.union(...breakdownKinds.map((kind) => v.literal(kind)));
export type BreakdownKind = typeof breakdownKinds[number];

export function dateKey(timestamp: number) {
  return new Date(timestamp + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function monthKeys(timestamp: number, count = 13) {
  const current = dateKey(timestamp).slice(0, 7);
  const [year, month] = current.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => new Date(Date.UTC(year, month - 1 - index, 1)).toISOString().slice(0, 7));
}

export function safePath(input: string): string | null {
  if (["/", "/parcalar", "/markalar", "/kategoriler", "/kurumsal", "/iletisim", "/gizlilik"].includes(input)) return input;
  return /^\/(parcalar|markalar|kategoriler)\/[a-z0-9-]{1,180}$/.test(input) ? input : null;
}

// Free-form text is never retained: only catalog terms/codes verified at ingestion.
export function safeSearch(input: string): string | null {
  const text = input.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
  if (text.length < 2 || text.length > 64 || !/^[A-ZÇĞİÖŞÜ0-9 .\/-]+$/.test(text)) return null;
  const compact = text.replace(/[^A-Z0-9]/g, "");
  const containsTurkishPhone = (text.match(/\d(?:[\s./-]*\d){8,}/g) ?? []).some((part) => /^(?:[2-5]\d{9}|0[2-5]\d{9}|90[2-5]\d{9})$/.test(part.replace(/\D/g, "")));
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(compact) || /\d{12,}/.test(compact) || (/\d{10,}/.test(compact) && text !== compact) || containsTurkishPhone || /\b(VIN|ŞASİ|SASI|TELEFON|TC)\b/.test(text)) return null;
  return text;
}

export function cleanEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  if (typeof data.id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data.id) || !isEventName(data.name) || typeof data.path !== "string") return null;
  const path = safePath(data.path);
  if (!path) return null;
  const name = data.name;
  const event: AnalyticsEvent = { id: data.id, name, path };
  if (name === "search") event.value = typeof data.value === "string" ? safeSearch(data.value) ?? "[gizlendi]" : "[gizlendi]";
  if (name === "filter_change") {
    if (typeof data.value !== "string" || !/^(category|brand|condition|stock|sort|reset):[a-zA-ZÇĞİÖŞÜçğıöşü0-9 ._-]{0,80}$/.test(data.value)) return null;
    event.value = data.value;
  }
  if (name === "search" && typeof data.resultCount === "number" && Number.isFinite(data.resultCount) && data.resultCount >= 0) event.resultCount = Math.min(10000, Math.floor(data.resultCount));
  if (typeof data.number === "number" && Number.isFinite(data.number)) {
    if (name === "engagement") event.number = Math.max(0, Math.min(60000, Math.floor(data.number)));
    if (name === "catalog_page" || name === "image_view") event.number = Math.max(1, Math.min(1000, Math.floor(data.number)));
  }
  return event;
}
