const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processLogo() {
  const sourcePath = 'C:\\Users\\volkan\\.gemini\\antigravity-ide\\brain\\407b7198-fedd-4df1-8b2f-a7ffdbc2185c\\beyindeposu_minimal_1790245067054.jpg';
  const targetDir = path.join(__dirname, '..', 'public', 'images');

  if (!fs.existsSync(sourcePath)) {
    console.error('Source logo file not found:', sourcePath);
    process.exit(1);
  }

  // 1. Trim whitespace/borders around logo
  const trimmedBuffer = await sharp(sourcePath)
    .trim()
    .toBuffer();

  const { data, info } = await sharp(trimmedBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // 2. Create transparent version: make white / near-white pixels transparent
  const transparentData = Buffer.from(data);
  for (let i = 0; i < transparentData.length; i += channels) {
    const r = transparentData[i];
    const g = transparentData[i + 1];
    const b = transparentData[i + 2];

    // If near white, make transparent with smooth falloff
    if (r > 240 && g > 240 && b > 240) {
      transparentData[i + 3] = 0;
    } else if (r > 220 && g > 220 && b > 220) {
      const avg = (r + g + b) / 3;
      const alpha = Math.max(0, Math.min(255, Math.round((255 - avg) * (255 / 35))));
      transparentData[i + 3] = alpha;
    }
  }

  const transparentPngBuffer = await sharp(transparentData, {
    raw: { width, height, channels }
  })
    .trim()
    .png()
    .toBuffer();

  // 3. Create White logo for dark backgrounds (Footer, Admin sidebar)
  // Non-transparent pixels become pure white
  const whiteData = Buffer.from(transparentData);
  for (let i = 0; i < whiteData.length; i += channels) {
    const a = whiteData[i + 3];
    if (a > 0) {
      whiteData[i] = 255;
      whiteData[i + 1] = 255;
      whiteData[i + 2] = 255;
    }
  }

  const whitePngBuffer = await sharp(whiteData, {
    raw: { width, height, channels }
  })
    .trim()
    .png()
    .toBuffer();

  // Write outputs
  fs.writeFileSync(path.join(targetDir, 'logo.png'), transparentPngBuffer);
  fs.writeFileSync(path.join(targetDir, 'logo_transparent.png'), transparentPngBuffer);
  fs.writeFileSync(path.join(targetDir, 'logo_white.png'), whitePngBuffer);

  console.log('Successfully generated:');
  console.log('- public/images/logo.png');
  console.log('- public/images/logo_transparent.png');
  console.log('- public/images/logo_white.png');
}

processLogo().catch(err => {
  console.error('Error processing logo:', err);
  process.exit(1);
});
