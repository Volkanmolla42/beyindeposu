import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";

export type RevalidateRequestPayload = {
  paths?: Array<string | { path: string; type?: "page" | "layout" }>;
};

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminApiRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json()) as RevalidateRequestPayload;
    const paths = Array.isArray(body?.paths) ? body.paths : [];

    const revalidated: string[] = [];

    for (const item of paths) {
      if (typeof item === "string" && item.startsWith("/")) {
        revalidatePath(item);
        revalidated.push(item);
      } else if (
        typeof item === "object" &&
        item !== null &&
        typeof item.path === "string" &&
        item.path.startsWith("/")
      ) {
        if (item.type === "page" || item.type === "layout") {
          revalidatePath(item.path, item.type);
        } else {
          revalidatePath(item.path);
        }
        revalidated.push(item.path);
      }
    }

    return NextResponse.json({
      success: true,
      revalidated,
    });
  } catch (error: unknown) {
    console.error("[api/revalidate] Revalidation error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Revalidation failed.",
      },
      { status: 500 }
    );
  }
}
