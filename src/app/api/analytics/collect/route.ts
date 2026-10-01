import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { cleanEvent, CONSENT_VERSION, type AnalyticsEvent } from "@convex/analyticsModel";
import { analyticsConfigured, convexAnalytics, createToken, jsonResponse, privacySignal, readConsent, readSmallJson, readToken, sameOrigin, SESSION_COOKIE, setCookie, signature, VISITOR_COOKIE } from "@/lib/analytics-server";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonResponse({ error: "Geçersiz istek." }, 403);
  const consent = readConsent(request);
  const visitorId = readToken(request, VISITOR_COOKIE);
  if (!analyticsConfigured() || privacySignal(request) || consent?.choice !== "granted" || !visitorId || /bot|crawler|spider|headless/i.test(request.headers.get("user-agent") ?? "")) return jsonResponse({ accepted: 0 });
  let body: unknown;
  try { body = await readSmallJson(request); } catch { return jsonResponse({ error: "Geçersiz istek." }, 400); }
  if (!body || typeof body !== "object") return jsonResponse({ error: "Geçersiz istek." }, 400);
  const data = body as Record<string, unknown>;
  const device = data.device;
  if (!Array.isArray(data.events) || data.events.length > 10 || (device !== "mobile" && device !== "tablet" && device !== "desktop")) return jsonResponse({ error: "Geçersiz ölçüm." }, 400);
  const events = data.events.map(cleanEvent).filter((event): event is AnalyticsEvent => event !== null);
  if (!events.length) return jsonResponse({ accepted: 0 });
  const existingSession = readToken(request, SESSION_COOKIE);
  const token = existingSession ? request.cookies.get(SESSION_COOKIE)!.value : createToken();
  const sessionId = existingSession ?? signature(`analytics:${token.split(".")[0]}`);
  try {
    const result = await convexAnalytics().mutation(api.analytics.ingest, { secret: process.env.ANALYTICS_INGEST_SECRET!, visitorId, sessionId, consentVersion: CONSENT_VERSION, consentAt: consent.at, device, source: typeof data.source === "string" ? data.source : "direct", events });
    const response = jsonResponse(result);
    if (result.accepted) setCookie(response, request, SESSION_COOKIE, token, 1800);
    return response;
  } catch {
    return jsonResponse({ error: "Ölçüm geçici olarak kullanılamıyor." }, 503);
  }
}
