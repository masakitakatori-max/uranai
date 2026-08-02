// Generates opaque source images for @capacitor/assets from the brand favicon.
// Output: assets/icon.png (1024²), assets/splash.png & splash-dark.png (2732²).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets");
const svg = await fs.readFile(path.join(root, "public", "favicon.svg"));

const BG = { r: 16, g: 24, b: 40, alpha: 1 }; // #101828 brand theme

async function compose(size, logoRatio, file) {
  const logoSize = Math.round(size * logoRatio);
  const logo = await sharp(svg, { density: 384 })
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(outDir, file));
  console.log("wrote", file, `${size}x${size}`);
}

await fs.mkdir(outDir, { recursive: true });
await compose(1024, 0.6, "icon.png");
await compose(2732, 0.28, "splash.png");
await compose(2732, 0.28, "splash-dark.png");
console.log("done");
