import type { CollectionReference, DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import type {
  AttendanceMark,
  AttendanceSunday,
  EventResponse,
  EventSurvey,
  Group,
  GroupLeaderTerm,
  LeaderMeeting,
  Member,
  MeetingAsset,
  PastoralMessage,
  PastoralThread,
  SeatingAssignment,
  SeatingZone,
  SharingAssignment,
  SharingGroup,
  SharingPlan,
  User,
  WorshipService,
} from "@/lib/types";
import type { Term } from "@/lib/term";

function collection<T extends DocumentData>(name: string) {
  return db.collection(name) as CollectionReference<T>;
}

export const usersCol = collection<Omit<User, "id">>("users");
export const groupsCol = collection<Omit<Group, "id">>("groups");
export const membersCol = collection<Omit<Member, "id">>("members");
export const groupLeaderTermsCol = collection<Omit<GroupLeaderTerm, "id">>("groupLeaderTerms");
export const leaderMeetingsCol = collection<Omit<LeaderMeeting, "id">>("leaderMeetings");
export const meetingAssetsCol = collection<Omit<MeetingAsset, "id">>("meetingAssets");
export const sharingPlansCol = collection<Omit<SharingPlan, "id">>("sharingPlans");
export const sharingGroupsCol = collection<Omit<SharingGroup, "id">>("sharingGroups");
export const sharingAssignmentsCol = collection<Omit<SharingAssignment, "id">>("sharingAssignments");
export const worshipServicesCol = collection<Omit<WorshipService, "id">>("worshipServices");
export const seatingZonesCol = collection<Omit<SeatingZone, "id">>("seatingZones");
export const seatingAssignmentsCol = collection<Omit<SeatingAssignment, "id">>("seatingAssignments");
export const pastoralThreadsCol = collection<Omit<PastoralThread, "id">>("pastoralThreads");
export const pastoralMessagesCol = collection<Omit<PastoralMessage, "id">>("pastoralMessages");
export const settingsCol = collection<Term>("settings");
export const attendanceSundaysCol = collection<Omit<AttendanceSunday, "id">>("attendanceSundays");
export const attendanceMarksCol = collection<Omit<AttendanceMark, "id">>("attendanceMarks");
export const eventSurveysCol = collection<Omit<EventSurvey, "id">>("eventSurveys");
export const eventResponsesCol = collection<Omit<EventResponse, "id">>("eventResponses");

export function withId<T extends DocumentData>(
  snap: QueryDocumentSnapshot<T>,
): T & { id: string } {
  return { id: snap.id, ...snap.data() };
}
