import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireAdminApiRequest } from "@/lib/auth/admin-api";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST_SIZE = 16 * 1024 * 1024;
const MAX_CONTENT_LENGTH = 17 * 1024 * 1024;
const MAX_FILES = 20;

function fileSafePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminApiRequest(req);
  if (unauthorized) return unauthorized;

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { success: false, message: "Tek istekte en fazla 16 MB görsel yüklenebilir." },
      { status: 413 },
    );
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;

    const filesToProcess: File[] = [];
    if (files && files.length > 0) {
      filesToProcess.push(...files);
    } else if (singleFile) {
      filesToProcess.push(singleFile);
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json(
        { success: false, message: "Yüklenecek dosya bulunamadı." },
        { status: 400 }
      );
    }

    if (filesToProcess.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: "Tek istekte en fazla 20 görsel yüklenebilir." },
        { status: 413 },
      );
    }

    if (filesToProcess.reduce((total, file) => total + file.size, 0) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { success: false, message: "Tek istekte en fazla 16 MB görsel yüklenebilir." },
        { status: 413 },
      );
    }

    for (const file of filesToProcess) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { success: false, message: "Yalnızca JPG, PNG, WebP veya AVIF görsel yüklenebilir." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: "Her görsel en fazla 10 MB olabilir." },
          { status: 400 }
        );
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    const publicBasePath = "/uploads/products";
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];
    const rawLabel = formData.get("label");
    const label = rawLabel ? fileSafePart(String(rawLabel)) : "";

    for (const file of filesToProcess) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isAlreadyWebp = file.type === "image/webp" || /\.webp$/i.test(file.name);
      const webp = isAlreadyWebp
        ? buffer
        : await sharp(buffer).rotate().webp({ quality: 90 }).toBuffer();
      const originalName = file.name || "upload.jpg";
      const ext = path.extname(originalName);
      let baseName = fileSafePart(path.basename(originalName, ext));
      baseName = baseName.replace(/^draft[-_]?import[-_]?/i, "").replace(/[-_]?draft[-_]?import/i, "");

      const cleanLabel = label.replace(/^draft[-_]?import[-_]?/i, "").replace(/[-_]?draft[-_]?import/i, "");
      const prefix = cleanLabel || baseName || "product";

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const fileName = `${prefix}-${uniqueSuffix}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, webp);
      uploadedUrls.push(`${publicBasePath}/${fileName}`);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      url: uploadedUrls[0] || null,
    });
  } catch (error: unknown) {
    console.error("Local upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Dosya yüklenirken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
