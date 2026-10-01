import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { CONSENT_VERSION, DAY } from "@convex/analyticsModel";

export const CONSENT_COOKIE = "bd_analytics_consent";
export const VISITOR_COOKIE = "bd_analytics_visitor";
export const SESSION_COOKIE = "bd_analytics_session";
export const ERASURE_COOKIE = "bd_analytics_erasure";
type Consent = { choice: "granted" | "denied"; version: string; at: number };

export function analyticsConfigured() {
  return (process.env.ANALYTICS_INGEST_SECRET?.length ?? 0) >= 32 && Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export function signature(value: string) {
  return createHmac("sha256", process.env.ANALYTICS_INGEST_SECRET ?? "").update(value).digest("hex");
}

function verified(value: string) {
  const split = value.lastIndexOf(".");
  const raw = value.slice(0, split);
  const sig = value.slice(split + 1);
  if (split < 0 || !/^[a-f0-9]{64}$/.test(sig) || !process.env.ANALYTICS_INGEST_SECRET) return null;
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(signature(raw), "hex")) ? raw : null;
}

export function encodeConsent(choice: Consent["choice"]) {
  const raw = Buffer.from(JSON.stringify({ choice, version: CONSENT_VERSION, at: Date.now() })).toString("base64url");
  return `${raw}.${signature(raw)}`;
}

export function readConsent(request: NextRequest): Consent | null {
  const raw = verified(request.cookies.get(CONSENT_COOKIE)?.value ?? "");
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (!data || typeof data !== "object") return null;
    const value = data as Record<string, unknown>;
    if ((value.choice !== "granted" && value.choice !== "denied") || value.version !== CONSENT_VERSION || typeof value.at !== "number" || !Number.isFinite(value.at) || value.at > Date.now() || Date.now() - value.at >= 180 * DAY) return null;
    return { choice: value.choice, version: value.version, at: value.at };
  } catch { return null; }
}

export function createToken() {
  const raw = randomBytes(32).toString("hex");
  return `${raw}.${signature(raw)}`;
}

export function readToken(request: NextRequest, cookie: string) {
  const raw = verified(request.cookies.get(cookie)?.value ?? "");
  return raw && /^[a-f0-9]{64}$/.test(raw) ? signature(`analytics:${raw}`) : null;
}

export function setCookie(response: NextResponse, request: NextRequest, name: string, value: string, maxAge: number) {
  response.cookies.set(name, value, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge });
}

export function sameOrigin(request: NextRequest) {
  // NextURL normalizes loopback addresses to localhost; Host retains the browser's actual authority.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  return request.headers.get("origin") === `${request.nextUrl.protocol}//${host}`;
}

export function privacySignal(request: NextRequest) {
  return request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1";
}

export function convexAnalytics() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Analitik yapılandırılmadı.");
  return new ConvexHttpClient(url);
}

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readSmallJson(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 16384) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(data));
}
