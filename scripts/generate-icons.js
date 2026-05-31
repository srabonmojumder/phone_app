const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'icons', 'pwa-icon.svg');
const outImages = path.join(root, 'assets', 'images');

if (!fs.existsSync(svgPath)) {
  console.error('Source SVG not found:', svgPath);
  process.exit(1);
}

if (!fs.existsSync(outImages)) fs.mkdirSync(outImages, { recursive: true });

const targets = [
  { name: 'icon.png', size: 1024 },
  { name: 'android-icon-foreground.png', size: 432 },
  { name: 'android-icon-background.png', size: 1024 },
  { name: 'android-icon-monochrome.png', size: 512 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
];

(async () => {
  try {
    for (const t of targets) {
      const out = path.join(outImages, t.name);
      await sharp(svgPath)
        .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(out);
      console.log('Wrote', out);
    }
    console.log('Icon generation completed.');
  } catch (err) {
    console.error('Icon generation failed:', err);
    process.exit(1);
  }
})();
