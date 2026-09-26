"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Input, Label } from "@/components/ui";

type ActionResult = { ok: false; error: string } | { ok: true };

export function AddLeaderForm({
  action,
  title = "가장으로 쓸 사람 추가",
  submitLabel = "계정 추가",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  title?: string;
  submitLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setDone(true);
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h3 className="font-medium text-stone-900">{title}</h3>
        <p className="mt-1 text-sm text-stone-600">
          로그인할 수 있는 계정이 있어야 가장이나 임원으로 앉힐 수 있습니다. 처음 비밀번호는 본인에게 알려 주세요.
        </p>
      </div>
      <div>
        <Label>이름</Label>
        <Input name="name" required placeholder="홍길동" />
      </div>
      <div>
        <Label>이메일</Label>
        <Input name="email" type="email" required autoComplete="off" placeholder="name@example.com" />
      </div>
      <div>
        <Label>처음 비밀번호</Label>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "추가 중" : submitLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      {done && <p className="text-sm text-stone-600 sm:col-span-2">추가했습니다. 가장 목록에서 고를 수 있습니다.</p>}
    </form>
  );
}
