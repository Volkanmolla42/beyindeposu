import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { analyticsConfigured, CONSENT_COOKIE, convexAnalytics, createToken, encodeConsent, ERASURE_COOKIE, jsonResponse, privacySignal, readConsent, readSmallJson, readToken, sameOrigin, SESSION_COOKIE, setCookie, VISITOR_COOKIE } from "@/lib/analytics-server";

export function GET(request: NextRequest) {
  const enabled = analyticsConfigured();
  const signal = privacySignal(request);
  const choice = signal ? "denied" : readConsent(request)?.choice ?? null;
  const response = jsonResponse({ enabled, choice, privacySignal: signal });
  if (enabled && choice === "granted" && !readToken(request, VISITOR_COOKIE)) {
    setCookie(response, request, VISITOR_COOKIE, createToken(), 90 * 86400);
    setCookie(response, request, SESSION_COOKIE, "", 0);
  }
  return response;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonResponse({ error: "Geçersiz istek." }, 403);
  let body: unknown;
  try { body = await readSmallJson(request); } catch { return jsonResponse({ error: "Geçersiz istek." }, 400); }
  if (!body || typeof body !== "object" || !("choice" in body) || (body.choice !== "granted" && body.choice !== "denied")) return jsonResponse({ error: "Geçersiz tercih." }, 400);
  const choice = body.choice;
  if (choice === "granted" && (!analyticsConfigured() || privacySignal(request))) return jsonResponse({ error: "Analitik yapılandırması eksik veya tarayıcı izlemeyi reddediyor." }, 409);
  const pendingErasure = readToken(request, ERASURE_COOKIE);
  if (choice === "granted" && pendingErasure) {
    try {
      await convexAnalytics().mutation(api.analytics.requestErasure, { secret: process.env.ANALYTICS_INGEST_SECRET!, visitorId: pendingErasure });
    } catch { return jsonResponse({ error: "Önceki silme isteği gönderilemedi. Tekrar deneyin." }, 503); }
  }
  const response = jsonResponse({ choice });
  setCookie(response, request, CONSENT_COOKIE, encodeConsent(choice), 180 * 86400);
  if (choice === "granted") {
    setCookie(response, request, ERASURE_COOKIE, "", 0);
    // Fixed expiry, not extended on every visit.
    if (!readToken(request, VISITOR_COOKIE)) {
      setCookie(response, request, VISITOR_COOKIE, createToken(), 90 * 86400);
      setCookie(response, request, SESSION_COOKIE, "", 0);
    }
    return response;
  }
  const currentVisitor = readToken(request, VISITOR_COOKIE);
  const visitorId = currentVisitor ?? pendingErasure;
  const token = request.cookies.get(currentVisitor ? VISITOR_COOKIE : ERASURE_COOKIE)?.value;
  setCookie(response, request, VISITOR_COOKIE, "", 0);
  setCookie(response, request, SESSION_COOKIE, "", 0);
  if (visitorId && token && process.env.ANALYTICS_INGEST_SECRET) {
    try {
      await convexAnalytics().mutation(api.analytics.requestErasure, { secret: process.env.ANALYTICS_INGEST_SECRET, visitorId });
      setCookie(response, request, ERASURE_COOKIE, "", 0);
    } catch {
      // Keep an HttpOnly deletion receipt so an outage cannot lose the erasure request.
      setCookie(response, request, ERASURE_COOKIE, token, 90 * 86400);
      const failure = jsonResponse({ choice: "denied", error: "İzleme kapatıldı. Kayıt silme isteği gönderilemedi; tekrar deneyin." }, 503);
      for (const cookie of response.cookies.getAll()) failure.cookies.set(cookie);
      return failure;
    }
  }
  return response;
}
