/**
 * PWA 아이콘 — 승인 디자인: 와인 버건디 + 흰 새싹 + 「2청」
 * 마스터: pwa-icons/icon-burgundy-sprout.png (없으면 SVG로 생성)
 * 실행: npm run icons:generate
 */
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "icons");
const masterPath = path.join(root, "pwa-icons", "icon-burgundy-sprout.png");

/** 승인 와인 버건디 */
const BURGUNDY = "#7A121D";
const BURGUNDY_DARK = "#5c1018";

/** 1024×1024 마스터 SVG (스쿼클 안에 새싹 + 「2청」) */
function masterSvg(size = 1024) {
  const s = size / 1024;
  const pad = 64 * s;
  const inner = size - pad * 2;
  const rx = 200 * s;
  const cx = size / 2;
  const sproutY = 340 * s;
  const fontSize = 118 * s;
  const textY = 700 * s;
  const stemW = 10 * s;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BURGUNDY_DARK}"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${rx}" fill="${BURGUNDY}"/>
  <g fill="#ffffff" transform="translate(${cx}, ${sproutY}) scale(${s})">
    <rect x="-5" y="18" width="10" height="88" rx="5"/>
    <path d="M0 22 C-52 -32 -78 2 -48 38 C-28 58 0 42 0 22Z"/>
    <path d="M0 22 C52 -32 78 2 48 38 C28 58 0 42 0 22Z"/>
  </g>
  <text x="50%" y="${textY}" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="700" font-size="${fontSize}px">2청</text>
</svg>`,
  );
}

async function ensureMaster() {
  try {
    await access(masterPath);
    return masterPath;
  } catch {
    await mkdir(path.dirname(masterPath), { recursive: true });
    const buf = await sharp(masterSvg(1024)).png().toBuffer();
    await writeFile(masterPath, buf);
    console.log(`created master ${masterPath}`);
    return masterPath;
  }
}

/** maskable: 중앙 80% 안전 영역 */
async function maskablePng(size, artwork) {
  const inset = Math.round(size * 0.1);
  const inner = size - inset * 2;
  const scaled = await sharp(artwork).resize(inner, inner).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BURGUNDY,
    },
  })
    .composite([{ input: scaled, left: inset, top: inset }])
    .png()
    .toBuffer();
}

const masterFile = await ensureMaster();
const masterBuf = await sharp(masterFile).png().toBuffer();

await mkdir(outDir, { recursive: true });

const png192 = await sharp(masterBuf).resize(192, 192).png().toBuffer();
await writeFile(path.join(outDir, "icon-192.png"), png192);
console.log("wrote icon-192.png");

const png512 = await sharp(masterBuf).resize(512, 512).png().toBuffer();
await writeFile(path.join(outDir, "icon-512.png"), png512);
console.log("wrote icon-512.png");

const maskable = await maskablePng(512, png512);
await writeFile(path.join(outDir, "icon-512-maskable.png"), maskable);
console.log("wrote icon-512-maskable.png");

const favicon = await sharp(masterBuf).resize(32, 32).png().toBuffer();
await writeFile(path.join(root, "public", "favicon.png"), favicon);
console.log("wrote public/favicon.png");
