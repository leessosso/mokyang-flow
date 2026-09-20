import ExcelJS from "exceljs";

const HEADER_WORDS = new Set(["이름", "성명", "name", "이름(성명)"]);

function isHeaderCell(value: string) {
  return HEADER_WORDS.has(value.trim());
}

function parseCsvNames(text: string): string[] {
  const names: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const firstCell = line.split(",")[0]?.trim().replace(/^"|"$/g, "") ?? "";
    if (!firstCell || isHeaderCell(firstCell)) continue;
    names.push(firstCell);
  }
  return names;
}

async function parseXlsxNames(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs가 bundle한 Buffer 타입과 @types/node의 Buffer 제네릭 버전이 어긋나 캐스팅이 필요하다.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const names: string[] = [];
  sheet.eachRow((row) => {
    const cell = row.getCell(1).value;
    const name = cell === null || cell === undefined ? "" : String(cell).trim();
    if (!name || isHeaderCell(name)) return;
    names.push(name);
  });
  return names;
}

/** QR 명단 파일(CSV 또는 xlsx)의 첫 열에서 이름을 추출한다. */
export async function parseNamesFromFile(buffer: Buffer, fileName: string): Promise<string[]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsxNames(buffer);
  }
  return parseCsvNames(buffer.toString("utf-8"));
}
