import { getDb } from "@/lib/firebase-admin";
import { isPollBannerDay } from "@/lib/poll-day";
import { getPollSiteUrl } from "@/lib/poll-site";

const SETTINGS_DOC = "settings/pollDay";

export type PollDaySettings = {
  /** Asia/Seoul 달력 날짜 YYYY-MM-DD */
  dateKey: string;
  updatedAt: string;
  updatedById: string;
};

export async function getPollDaySettings(): Promise<PollDaySettings | null> {
  const doc = await getDb().doc(SETTINGS_DOC).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data?.dateKey || typeof data.dateKey !== "string") return null;
  return {
    dateKey: data.dateKey,
    updatedAt: String(data.updatedAt ?? ""),
    updatedById: String(data.updatedById ?? ""),
  };
}

export async function setPollDaySettings(
  dateKey: string,
  updatedById: string,
): Promise<void> {
  await getDb()
    .doc(SETTINGS_DOC)
    .set({
      dateKey,
      updatedAt: new Date().toISOString(),
      updatedById,
    });
}

export async function clearPollDaySettings(): Promise<void> {
  await getDb().doc(SETTINGS_DOC).delete();
}

export type PollDayBanner = {
  href: string;
  pollDateKey: string;
};

/** 투표일 당일에만 홈 상단 배너 정보를 반환한다. */
export async function getPollDayBannerIfToday(now = new Date()): Promise<PollDayBanner | null> {
  const settings = await getPollDaySettings();
  if (!settings || !isPollBannerDay(settings.dateKey, now)) return null;
  return {
    href: getPollSiteUrl(),
    pollDateKey: settings.dateKey,
  };
}
