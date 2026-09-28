import "server-only";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { NextResponse } from "next/server";

export async function requireAdminApiRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
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
  if (sourceOrigin && sourceOrigin !== requestOrigin) {
    return NextResponse.json({ error: "Yetkisiz istek kaynağı." }, { status: 403 });
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
