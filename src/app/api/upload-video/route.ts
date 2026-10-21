import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
]);
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

function fileSafePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminApiRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Yüklenecek video dosyası bulunamadı." },
        { status: 400 }
      );
    }

    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçerli bir video formatı seçin (MP4, WebM, MOV veya OGG).",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, message: "Video en fazla 100 MB olabilir." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "services");
    const publicBasePath = "/uploads/services";
    await mkdir(uploadDir, { recursive: true });

    const rawLabel = formData.get("label");
    const label = rawLabel ? fileSafePart(String(rawLabel)) : "";
    const originalName = file.name || "video.mp4";
    const ext = path.extname(originalName).toLowerCase() || ".mp4";
    const baseName = fileSafePart(path.basename(originalName, ext));
    const prefix = label || baseName || "service";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const fileName = `${prefix}-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `${publicBasePath}/${fileName}`,
    });
  } catch (error: unknown) {
    console.error("Local video upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Video yüklenirken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
