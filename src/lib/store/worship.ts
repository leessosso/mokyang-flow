import {
  seatingAssignmentsCol,
  seatingZonesCol,
  withId,
  worshipServicesCol,
} from "@/lib/store/collections";
import type { SeatingAssignment, SeatingZone, WorshipService } from "@/lib/types";

export async function listWorshipServices(): Promise<WorshipService[]> {
  const snap = await worshipServicesCol.get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getWorshipServiceById(id: string): Promise<WorshipService | null> {
  const doc = await worshipServicesCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function listZonesByService(serviceId: string): Promise<SeatingZone[]> {
  const snap = await seatingZonesCol.where("serviceId", "==", serviceId).get();
  return snap.docs.map(withId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listAssignmentsByService(serviceId: string): Promise<SeatingAssignment[]> {
  const snap = await seatingAssignmentsCol.where("serviceId", "==", serviceId).get();
  return snap.docs.map(withId);
}

const DEFAULT_ZONE_NAMES = ["좌측 A구역", "중앙 B구역", "우측 C구역", "발코니 D구역"];

export async function createWorshipService(date: string, title: string): Promise<WorshipService> {
  const ref = worshipServicesCol.doc();
  const service: Omit<WorshipService, "id"> = { date, title };
  await ref.set(service);

  await Promise.all(
    DEFAULT_ZONE_NAMES.map((name, i) =>
      seatingZonesCol.doc().set({
        serviceId: ref.id,
        name,
        sortOrder: i,
        gridRow: Math.floor(i / 2),
        gridCol: i % 2,
      }),
    ),
  );

  return { id: ref.id, ...service };
}

export async function assignGroupSeating(serviceId: string, groupId: string, zoneId: string) {
  const snap = await seatingAssignmentsCol
    .where("serviceId", "==", serviceId)
    .where("groupId", "==", groupId)
    .get();
  if (snap.empty) {
    await seatingAssignmentsCol.doc().set({ serviceId, groupId, zoneId });
  } else {
    await snap.docs[0].ref.update({ zoneId });
  }
}
