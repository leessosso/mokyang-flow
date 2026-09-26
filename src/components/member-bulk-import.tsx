"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Label, Textarea } from "@/components/ui";

type ImportResult =
  | { ok: false; error: string }
  | { ok: true; added: number; skipped: number };

export function MemberBulkImport({
  action,
}: {
  action: (formData: FormData) => Promise<ImportResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      const skipped = result.skipped > 0 ? ` 이미 있는 이름 ${result.skipped}명은 건너뛰었습니다.` : "";
      setSummary(`${result.added}명을 넣었습니다.${skipped}`);
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3 border-t border-stone-100 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-medium text-stone-900">가족원 한꺼번에 넣기</h3>
        <p className="mt-1 text-sm text-stone-600">
          한 줄에 한 명씩 붙여 넣거나, CSV·엑셀 파일을 올립니다. 연락처는 이름 옆 둘째 칸입니다.
        </p>
      </div>
      <div>
        <Label>이름 목록</Label>
        <Textarea
          name="text"
          rows={6}
          placeholder={"김민수\n정하늘, 010-0000-0000"}
        />
      </div>
      <div>
        <Label>또는 파일</Label>
        <input name="file" type="file" accept=".csv,.txt,.xlsx,.xls" className="text-sm" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "넣는 중" : "한꺼번에 넣기"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {summary && <p className="text-sm text-stone-600">{summary}</p>}
    </form>
  );
}
