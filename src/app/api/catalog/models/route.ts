import { NextRequest, NextResponse } from "next/server";
import { getPublicModelsByBrands } from "@/lib/seo-data";

export async function GET(req: NextRequest) {
  const brands = req.nextUrl.searchParams
    .getAll("brand")
    .map((value) => value.trim())
    .filter((value) => value && value !== "Tümü" && value !== "all");

  if (brands.length === 0 || brands.length > 10) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }

  try {
    const models = await getPublicModelsByBrands(brands);
    return NextResponse.json(models, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
