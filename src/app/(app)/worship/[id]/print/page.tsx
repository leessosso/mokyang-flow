import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateKo } from "@/lib/format";

export default async function WorshipPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await prisma.worshipService.findUnique({
    where: { id },
    include: {
      zones: { orderBy: { sortOrder: "asc" } },
      assignments: { include: { group: true, zone: true } },
    },
  });
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-stone-900 print:p-4">
      <h1 className="text-2xl font-bold">2청년회 예배 좌석 안내</h1>
      <p className="mt-1 text-stone-600">
        {service.title} · {formatDateKo(service.date)}
      </p>
      <div className="mt-8 grid grid-cols-2 gap-6">
        {service.zones.map((zone) => {
          const groups = service.assignments
            .filter((a) => a.zoneId === zone.id)
            .map((a) => a.group.name);
          return (
            <div key={zone.id} className="border border-stone-300 p-4">
              <h2 className="text-lg font-semibold">{zone.name}</h2>
              <p className="mt-2 text-base">
                {groups.length ? groups.join(", ") : "—"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-stone-500">인도자·조장 배포용</p>
    </div>
  );
}
