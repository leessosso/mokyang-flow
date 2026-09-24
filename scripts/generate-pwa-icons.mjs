/**
 * PWA 아이콘 — 마스터 PNG만 사용 (승인 아트워크, 수정·대체 생성 없음)
 * 마스터: pwa-icons/icon-burgundy-sprout.png
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

/** 승인 배경색 (maskable 여백 채움) */
const BURGUNDY = "#7A121D";

async function loadMaster() {
  try {
    await access(masterPath);
  } catch {
    throw new Error(
      `마스터 아이콘이 없습니다: ${masterPath}\n승인 PNG를 해당 경로에 두고 다시 실행하세요.`,
    );
  }
  return sharp(masterPath).ensureAlpha().png().toBuffer();
}

/**
 * maskable: 마스터를 512에 맞춤(그래픽 크게 유지).
 * 추가 10% 축소 패딩 없음 — 승인 아트가 이미 캔버스를 채움.
 */
async function maskablePng(size, masterBuf) {
  return sharp(masterBuf)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

const masterBuf = await loadMaster();

await mkdir(outDir, { recursive: true });

const png192 = await sharp(masterBuf).resize(192, 192, { fit: "cover" }).png().toBuffer();
await writeFile(path.join(outDir, "icon-192.png"), png192);
console.log("wrote icon-192.png");

const png512 = await sharp(masterBuf).resize(512, 512, { fit: "cover" }).png().toBuffer();
await writeFile(path.join(outDir, "icon-512.png"), png512);
console.log("wrote icon-512.png");

const maskable = await maskablePng(512, masterBuf);
await writeFile(path.join(outDir, "icon-512-maskable.png"), maskable);
console.log("wrote icon-512-maskable.png");

const favicon = await sharp(masterBuf).resize(32, 32, { fit: "cover" }).png().toBuffer();
await writeFile(path.join(root, "public", "favicon.png"), favicon);
console.log("wrote public/favicon.png");
