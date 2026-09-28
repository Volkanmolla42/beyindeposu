import "server-only";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextResponse } from "next/server";

export async function requireAdminApiRequest(request: Request) {
  const urlOrigin = new URL(request.url).origin;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  const hostOrigin = host ? `${proto}://${host}` : null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let sourceOrigin = origin;
  if (!sourceOrigin && referer) {
    try {
      sourceOrigin = new URL(referer).origin;
    } catch {
      return NextResponse.json({ error: "Yetkisiz istek kaynağı." }, { status: 403 });
    }
  }
  if (sourceOrigin) {
    const isProdDomain =
      sourceOrigin === "https://beyindeposu.com" ||
      sourceOrigin === "https://www.beyindeposu.com" ||
      (process.env.SITE_URL ? sourceOrigin === new URL(process.env.SITE_URL).origin : false);

    const isMatchingOrigin =
      isProdDomain ||
      sourceOrigin === hostOrigin ||
      sourceOrigin === urlOrigin ||
      (process.env.NODE_ENV !== "production" && (
        sourceOrigin.includes("localhost") ||
        sourceOrigin.includes("127.0.0.1") ||
        sourceOrigin.includes("192.168.") ||
        sourceOrigin.includes("10.") ||
        sourceOrigin.includes("172.")
      ));

    if (!isMatchingOrigin) {
      console.warn(`[admin-api] Origin mismatch: source=${sourceOrigin}, hostOrigin=${hostOrigin}, urlOrigin=${urlOrigin}`);
      return NextResponse.json({ error: "Yetkisiz istek kaynağı." }, { status: 403 });
    }
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  try {
    const isAdmin = await fetchQuery(api.users.isAdmin, {}, { token });
    if (!isAdmin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("Admin API authorization failed:", error);
    return NextResponse.json({ error: "Yetki doğrulanamadı." }, { status: 503 });
  }
}
