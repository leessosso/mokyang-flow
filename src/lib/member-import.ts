import ExcelJS from "exceljs";

const NAME_HEADERS = new Set(["이름", "성명", "name", "이름(성명)"]);
const PHONE_HEADERS = new Set(["연락처", "전화", "전화번호", "휴대폰", "phone", "tel"]);

export type MemberRow = { name: string; phone: string | null };

function isNameHeader(value: string) {
  return NAME_HEADERS.has(value.trim().toLowerCase()) || NAME_HEADERS.has(value.trim());
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("").trim();
  }
  return "";
}

function pushRow(rows: MemberRow[], name: string, phone: string) {
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  if (!trimmedName || isNameHeader(trimmedName)) return;
  rows.push({ name: trimmedName, phone: trimmedPhone && !PHONE_HEADERS.has(trimmedPhone) ? trimmedPhone : null });
}

/** 한 줄에 한 명. `이름` 또는 `이름, 연락처`(탭도 가능). */
export function parseMemberRowsFromText(text: string): MemberRow[] {
  const rows: MemberRow[] = [];
  const body = text.replace(/^\uFEFF/, "");
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const [name = "", phone = ""] = line.split(/[,\t]/).map((part) => part.trim().replace(/^"|"$/g, ""));
    pushRow(rows, name, phone);
  }
  return rows;
}

async function parseXlsxRows(buffer: Buffer): Promise<MemberRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: MemberRow[] = [];
  sheet.eachRow((row) => {
    pushRow(rows, cellText(row.getCell(1).value), cellText(row.getCell(2).value));
  });
  return rows;
}

export async function parseMemberRowsFromFile(buffer: Buffer, fileName: string): Promise<MemberRow[]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseXlsxRows(buffer);
  return parseMemberRowsFromText(buffer.toString("utf-8"));
}
