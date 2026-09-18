import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function sqliteUrl() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    if (filePath.startsWith("/")) return filePath;
    return `${process.cwd()}/${filePath.replace(/^\.\//, "")}`;
  }
  return url;
}

export function createSqliteAdapter() {
  return new PrismaBetterSqlite3({ url: sqliteUrl() });
}
