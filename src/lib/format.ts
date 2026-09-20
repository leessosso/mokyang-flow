import { format } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDateKo(d: Date | string) {
  return format(typeof d === "string" ? new Date(d) : d, "yyyy년 M월 d일 (EEE)", { locale: ko });
}

export function formatDateTimeKo(d: Date | string) {
  return format(typeof d === "string" ? new Date(d) : d, "yyyy년 M월 d일 HH:mm", { locale: ko });
}

export function roleLabel(role: string) {
  switch (role) {
    case "PASTOR":
      return "목사";
    case "ADMIN":
      return "관리자";
    case "LEADER":
      return "리더";
    default:
      return role;
  }
}

export { termLabel } from "@/lib/term";
