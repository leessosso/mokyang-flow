import {
  leaderMeetingsCol,
  meetingAssetsCol,
  withId,
} from "@/lib/store/collections";
import type { LeaderMeeting, MeetingAsset, MeetingAssetKind } from "@/lib/types";

export async function listMeetings(): Promise<LeaderMeeting[]> {
  const snap = await leaderMeetingsCol.get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<LeaderMeeting | null> {
  const doc = await leaderMeetingsCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function createMeeting(data: {
  title: string;
  date: string;
  notes?: string | null;
}): Promise<LeaderMeeting> {
  const ref = leaderMeetingsCol.doc();
  const meeting: Omit<LeaderMeeting, "id"> = {
    title: data.title,
    date: data.date,
    notes: data.notes ?? null,
    prayerLeaderId: null,
    createdAt: new Date().toISOString(),
  };
  await ref.set(meeting);
  return { id: ref.id, ...meeting };
}

export async function updateMeetingNotes(meetingId: string, notes: string) {
  await leaderMeetingsCol.doc(meetingId).update({ notes });
}

export async function setMeetingPrayerLeader(meetingId: string, prayerLeaderId: string | null) {
  await leaderMeetingsCol.doc(meetingId).update({ prayerLeaderId });
}

export async function listAssetsByMeeting(meetingId: string): Promise<MeetingAsset[]> {
  const snap = await meetingAssetsCol.where("meetingId", "==", meetingId).get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addMeetingAsset(data: {
  meetingId: string;
  kind: MeetingAssetKind;
  fileName: string;
  storageKey: string;
  uploadedById: string;
}): Promise<MeetingAsset> {
  const ref = meetingAssetsCol.doc();
  const asset: Omit<MeetingAsset, "id"> = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  await ref.set(asset);
  return { id: ref.id, ...asset };
}

export async function getMeetingAssetById(id: string): Promise<MeetingAsset | null> {
  const doc = await meetingAssetsCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}
