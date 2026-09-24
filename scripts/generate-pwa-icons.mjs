/**
 * PWA 아이콘 생성 — 삼성/안드로이드 홈 화면용 192·512 PNG (불투명 배경).
 * 실행: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

const BRAND = "#292524";
const TEXT = "#fafaf9";

function iconSvg(size, { maskable }) {
  const pad = maskable ? Math.round(size * 0.12) : Math.round(size * 0.08);
  const inner = size - pad * 2;
  const radius = Math.round(inner * 0.18);
  const fontSize = Math.round(inner * 0.38);
  const y = Math.round(size * 0.56);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${radius}" fill="${BRAND}" stroke="${TEXT}" stroke-width="${Math.max(2, Math.round(size * 0.012))}"/>
  <text x="50%" y="${y}" text-anchor="middle" fill="${TEXT}" font-family="system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="700" font-size="${fontSize}px">2청</text>
</svg>`,
  );
}

async function writePng(filename, size, opts) {
  const buf = await sharp(iconSvg(size, opts)).png().toBuffer();
  await writeFile(path.join(outDir, filename), buf);
  console.log(`wrote ${filename} (${size}x${size})`);
}

await mkdir(outDir, { recursive: true });
await writePng("icon-192.png", 192, { maskable: false });
await writePng("icon-512.png", 512, { maskable: false });
await writePng("icon-512-maskable.png", 512, { maskable: true });

// favicon (브라우저 탭)
const favicon = await sharp(iconSvg(32, { maskable: false })).png().toBuffer();
await writeFile(path.join(__dirname, "..", "public", "favicon.png"), favicon);
console.log("wrote public/favicon.png (32x32)");
