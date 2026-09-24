import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileSafePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export async function POST(req: NextRequest) {
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

    const uploadDir = process.env.PRODUCT_UPLOAD_DIR
      ? path.resolve(process.env.PRODUCT_UPLOAD_DIR)
      : path.join(process.cwd(), "public", "uploads", "products");
    const publicBasePath = (process.env.PRODUCT_UPLOAD_PUBLIC_PATH || "/uploads/products")
      .replace(/\/+$/, "")
      .replace(/^([^/])/, "/$1");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];
    const label = fileSafePart(String(formData.get("label") || "product"));

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

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const originalName = file.name || "upload.jpg";
      const ext = path.extname(originalName) || ".jpg";
      const baseName = fileSafePart(path.basename(originalName, ext));

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const fileName = `${label || baseName || "product"}-${uniqueSuffix}${ext.toLowerCase()}`;
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, buffer);
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
