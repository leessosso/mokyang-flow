"use client";

import { useState, useTransition } from "react";
import { appointOfficerAction, createOfficerAction, vacateOfficerAction } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";
import { OFFICER_TITLES, type OfficerTitle } from "@/lib/types";

type LeaderOption = { id: string; name: string; email: string };

export function OfficerYearBoard({
  year,
  half,
  seats,
  leaders,
  isPastor,
}: {
  year: number;
  half: "H1" | "H2";
  seats: { title: OfficerTitle; name: string | null; email: string | null; userId: string | null }[];
  leaders: LeaderOption[];
  isPastor: boolean;
}) {
  const filled = new Set(seats.map((seat) => seat.userId).filter(Boolean));
  const openLeaders = leaders.filter((leader) => !filled.has(leader.id));
  const subtitle =
    half === "H2"
      ? "하반기에는 임원을 다시 짜지 않습니다. 빈 자리는 목사만 채웁니다."
      : "올해 임원입니다. 목사가 직책을 앉히면, 그 임원이 가족과 가장을 구성합니다.";

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{year}년 임원</h3>
        <p className="text-sm text-stone-600">{subtitle}</p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {OFFICER_TITLES.map((title) => {
          const seat = seats.find((item) => item.title === title);
          return (
            <li key={title} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-medium text-stone-900">{title}</p>
              {seat?.userId ? (
                <FilledSeat title={title} name={seat.name ?? "알 수 없음"} email={seat.email} isPastor={isPastor} />
              ) : (
                <EmptySeat title={title} leaders={openLeaders} isPastor={isPastor} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FilledSeat({
  title,
  name,
  email,
  isPastor,
}: {
  title: OfficerTitle;
  name: string;
  email: string | null;
  isPastor: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm text-stone-800">{name}</p>
        {email && <p className="text-xs text-stone-500">{email}</p>}
      </div>
      {isPastor && (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await vacateOfficerAction(formData);
              if (!result.ok) setError(result.error);
            });
          }}
        >
          <input type="hidden" name="title" value={title} />
          <Button type="submit" variant="secondary" disabled={pending}>
            비우기
          </Button>
        </form>
      )}
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}

function EmptySeat({
  title,
  leaders,
  isPastor,
}: {
  title: OfficerTitle;
  leaders: LeaderOption[];
  isPastor: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isPastor) {
    return <p className="mt-2 text-sm text-stone-500">비어 있음</p>;
  }

  function run(action: (formData: FormData) => Promise<{ ok: false; error: string } | { ok: true }>) {
    return (formData: FormData) => {
      setError(null);
      startTransition(async () => {
        const result = await action(formData);
        if (!result.ok) setError(result.error);
      });
    };
  }

  return (
    <div className="mt-3 space-y-3">
      {leaders.length > 0 && (
        <form action={run(appointOfficerAction)} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="title" value={title} />
          <div className="min-w-40 flex-1">
            <Label>등록된 사람</Label>
            <select
              name="userId"
              required
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>
                선택
              </option>
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            임명
          </Button>
        </form>
      )}
      <form action={run(createOfficerAction)} className="grid gap-2">
        <input type="hidden" name="title" value={title} />
        <p className="text-xs text-stone-500">목록에 없으면 이 직책으로 추가</p>
        <Input name="name" required placeholder="이름" />
        <Input name="email" type="email" required autoComplete="off" placeholder="이메일" />
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="처음 비밀번호" />
        <Button type="submit" variant="secondary" disabled={pending}>
          추가하고 임명
        </Button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
