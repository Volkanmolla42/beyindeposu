import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandingPath = path.join(projectRoot, "src", "branding");
const imagesPath = path.join(projectRoot, "public", "images");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const sourceLogos = {
  stacked: path.join(brandingPath, "beyin-deposu-stacked.webp"),
  horizontal: path.join(brandingPath, "beyin-deposu-horizontal.webp"),
  mark: path.join(brandingPath, "beyin-deposu-mark.webp"),
};

async function trimTransparent(sourcePath) {
  return sharp(sourcePath)
    .ensureAlpha()
    .trim({ background: transparent, threshold: 8 })
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function createHorizontalVariant(sourcePath, outputPath) {
  const { data, info } = await trimTransparent(sourcePath);

  const fitted = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(960, 216, { fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });

  const left = Math.round((1024 - fitted.info.width) / 2);
  const top = Math.round((256 - fitted.info.height) / 2);

  await sharp({
    create: { width: 1024, height: 256, channels: 4, background: transparent },
  })
    .composite([{ input: fitted.data, left, top }])
    .webp({ lossless: true })
    .toFile(outputPath);
}

const stacked = await trimTransparent(sourceLogos.stacked);
const stackPadding = Math.round(Math.max(stacked.info.width, stacked.info.height) * 0.035);
await sharp(stacked.data, {
  raw: { width: stacked.info.width, height: stacked.info.height, channels: 4 },
})
  .extend({
    top: stackPadding,
    bottom: stackPadding,
    left: stackPadding,
    right: stackPadding,
    background: transparent,
  })
  .webp({ lossless: true })
  .toFile(path.join(imagesPath, "logo.webp"));

await createHorizontalVariant(
  sourceLogos.horizontal,
  path.join(imagesPath, "logo_transparent.webp"),
);
const mark = await trimTransparent(sourceLogos.mark);
const fittedMark = await sharp(mark.data, {
  raw: { width: mark.info.width, height: mark.info.height, channels: 4 },
})
  .resize(430, 430, { fit: "contain", background: transparent })
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: transparent },
})
  .composite([{ input: fittedMark, left: 41, top: 41 }])
  .webp({ lossless: true })
  .toFile(path.join(imagesPath, "logo-mark.webp"));

function createIconImage(size, rgba) {
  const xorBitmap = Buffer.alloc(size * size * 4);
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(maskRowBytes * size);

  for (let outputY = 0; outputY < size; outputY += 1) {
    const sourceY = size - outputY - 1;

    for (let x = 0; x < size; x += 1) {
      const sourceOffset = (sourceY * size + x) * 4;
      const outputOffset = (outputY * size + x) * 4;
      const alpha = rgba[sourceOffset + 3];

      xorBitmap[outputOffset] = rgba[sourceOffset + 2];
      xorBitmap[outputOffset + 1] = rgba[sourceOffset + 1];
      xorBitmap[outputOffset + 2] = rgba[sourceOffset];
      xorBitmap[outputOffset + 3] = alpha;

      if (alpha < 128) {
        const maskOffset = outputY * maskRowBytes + Math.floor(x / 8);
        andMask[maskOffset] |= 0x80 >> (x % 8);
      }
    }
  }

  const bitmapHeader = Buffer.alloc(40);
  bitmapHeader.writeUInt32LE(40, 0);
  bitmapHeader.writeInt32LE(size, 4);
  bitmapHeader.writeInt32LE(size * 2, 8);
  bitmapHeader.writeUInt16LE(1, 12);
  bitmapHeader.writeUInt16LE(32, 14);
  bitmapHeader.writeUInt32LE(0, 16);
  bitmapHeader.writeUInt32LE(xorBitmap.length + andMask.length, 20);

  return Buffer.concat([bitmapHeader, xorBitmap, andMask]);
}

async function createFavicon() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = [];

  for (const size of sizes) {
    const { data } = await sharp(path.join(imagesPath, "logo-mark.webp"))
      .resize(size, size, {
        fit: "contain",
        background: transparent,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    images.push({ size, data: createIconImage(size, data) });
  }

  const directory = Buffer.alloc(6);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);

  const entries = [];
  let imageOffset = directory.length + images.length * 16;

  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(imageOffset, 12);
    entries.push(entry);
    imageOffset += image.data.length;
  }

  const faviconPath = path.join(projectRoot, "src", "app", "favicon.ico");
  await writeFile(faviconPath, Buffer.concat([directory, ...entries, ...images.map(({ data }) => data)]));
}

await createFavicon();
console.log("Built stacked and horizontal WebP logos, BD mark, and src/app/favicon.ico.");
