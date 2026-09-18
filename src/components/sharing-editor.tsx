"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { moveMemberSharing, runAutoSharing } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";

type Group = {
  id: string;
  name: string;
  assignments: { member: { id: string; name: string } }[];
};

export function SharingEditor({
  planId,
  useHomeGroups,
  groups,
}: {
  planId: string;
  useHomeGroups: boolean;
  groups: Group[];
}) {
  const router = useRouter();
  const [groupCount, setGroupCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [dragMemberId, setDragMemberId] = useState<string | null>(null);

  async function onAuto() {
    setLoading(true);
    await runAutoSharing(planId, groupCount);
    setLoading(false);
    router.refresh();
  }

  async function onDrop(toGroupId: string, memberId: string) {
    setLoading(true);
    await moveMemberSharing(memberId, toGroupId, planId);
    setLoading(false);
    router.refresh();
  }

  const unassigned: { id: string; name: string }[] = [];

  return (
    <div className="space-y-4">
      {!useHomeGroups && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-stone-50 p-4">
          <div>
            <Label>나눔조 개수</Label>
            <Input
              type="number"
              min={2}
              max={12}
              value={groupCount}
              onChange={(e) => setGroupCount(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <Button type="button" onClick={onAuto} disabled={loading}>
            자동 균형 배치
          </Button>
          <p className="text-xs text-stone-500">
            드래그로 조원을 다른 나눔조로 옮길 수 있습니다.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-stone-200 bg-white p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const mid = dragMemberId || e.dataTransfer.getData("memberId");
              if (mid) onDrop(g.id, mid);
              setDragMemberId(null);
            }}
          >
            <h4 className="mb-2 font-medium text-stone-900">{g.name}</h4>
            <ul className="space-y-1">
              {g.assignments.map((a) => (
                <li
                  key={a.member.id}
                  draggable={!useHomeGroups}
                  onDragStart={(e) => {
                    setDragMemberId(a.member.id);
                    e.dataTransfer.setData("memberId", a.member.id);
                  }}
                  className={`rounded-lg border border-stone-100 bg-stone-50 px-2 py-1.5 text-sm ${
                    !useHomeGroups ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                >
                  {a.member.name}
                </li>
              ))}
              {g.assignments.length === 0 && (
                <li className="text-xs text-stone-400">비어 있음</li>
              )}
            </ul>
          </div>
        ))}
      </div>
      {unassigned.length > 0 && (
        <p className="text-sm text-amber-700">미배정 {unassigned.length}명</p>
      )}
    </div>
  );
}
