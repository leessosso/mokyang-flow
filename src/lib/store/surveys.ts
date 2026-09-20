import { eventResponsesCol, eventSurveysCol, withId } from "@/lib/store/collections";
import type { EventResponse, EventSurvey, SurveyQuestion } from "@/lib/types";

function responseId(surveyId: string, memberId: string) {
  return `${surveyId}_${memberId}`;
}

export async function listEventSurveys(): Promise<EventSurvey[]> {
  const snap = await eventSurveysCol.get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}

export async function getEventSurveyById(id: string): Promise<EventSurvey | null> {
  const doc = await eventSurveysCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function createEventSurvey(data: {
  title: string;
  eventDate: string;
  description?: string | null;
  questions: SurveyQuestion[];
}): Promise<EventSurvey> {
  const ref = eventSurveysCol.doc();
  const survey: Omit<EventSurvey, "id"> = {
    title: data.title,
    eventDate: data.eventDate,
    description: data.description ?? null,
    status: "open",
    questions: data.questions,
    createdAt: new Date().toISOString(),
  };
  await ref.set(survey);
  return { id: ref.id, ...survey };
}

export async function setEventSurveyStatus(id: string, status: "open" | "closed") {
  await eventSurveysCol.doc(id).update({ status });
}

export async function listResponsesBySurvey(surveyId: string): Promise<EventResponse[]> {
  const snap = await eventResponsesCol.where("surveyId", "==", surveyId).get();
  return snap.docs.map(withId);
}

export async function listResponsesBySurveyAndGroup(
  surveyId: string,
  groupId: string,
): Promise<EventResponse[]> {
  const snap = await eventResponsesCol
    .where("surveyId", "==", surveyId)
    .where("groupId", "==", groupId)
    .get();
  return snap.docs.map(withId);
}

export function responseMapByMemberId(responses: EventResponse[]): Map<string, EventResponse> {
  return new Map(responses.map((r) => [r.memberId, r]));
}

export type SaveResponseEntry = {
  memberId: string;
  groupId: string;
  answers: Record<string, string | number | boolean>;
};

export async function saveSurveyResponses(
  surveyId: string,
  entries: SaveResponseEntry[],
  updatedById: string,
): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    entries.map((entry) => {
      const ref = eventResponsesCol.doc(responseId(surveyId, entry.memberId));
      const response: Omit<EventResponse, "id"> = {
        surveyId,
        memberId: entry.memberId,
        groupId: entry.groupId,
        answers: entry.answers,
        updatedAt: now,
        updatedById,
      };
      return ref.set(response);
    }),
  );
}

export type SurveyGroupTotals = {
  respondedCount: number;
  memberCount: number;
  perQuestion: Record<string, { yesCount?: number; numberSum?: number }>;
};

export function summarizeResponses(
  memberIds: string[],
  responses: Map<string, EventResponse>,
  questions: SurveyQuestion[],
): SurveyGroupTotals {
  const totals: SurveyGroupTotals = {
    respondedCount: 0,
    memberCount: memberIds.length,
    perQuestion: {},
  };
  for (const q of questions) {
    totals.perQuestion[q.id] = q.type === "yesno" ? { yesCount: 0 } : q.type === "number" ? { numberSum: 0 } : {};
  }

  for (const memberId of memberIds) {
    const response = responses.get(memberId);
    if (!response) continue;
    totals.respondedCount += 1;
    for (const q of questions) {
      const answer = response.answers[q.id];
      if (q.type === "yesno" && answer === true) {
        totals.perQuestion[q.id].yesCount = (totals.perQuestion[q.id].yesCount ?? 0) + 1;
      } else if (q.type === "number" && typeof answer === "number") {
        totals.perQuestion[q.id].numberSum = (totals.perQuestion[q.id].numberSum ?? 0) + answer;
      }
    }
  }
  return totals;
}
