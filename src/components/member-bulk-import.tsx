"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, Textarea } from "@/components/ui";

type ImportResult =
  | { ok: false; error: string }
  | { ok: true; added: number; skipped: number };

export function MemberBulkImport({
  families,
  action,
}: {
  families: { id: string; label: string }[];
  action: (formData: FormData) => Promise<ImportResult>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const groupId = String(formData.get("groupId") ?? "");
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      const select = formRef.current?.elements.namedItem("groupId");
      if (select instanceof HTMLSelectElement) select.value = groupId;
      const skipped = result.skipped > 0 ? ` 이미 있는 이름 ${result.skipped}명은 건너뛰었습니다.` : "";
      setSummary(`${result.added}명을 넣었습니다.${skipped}`);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <div>
        <Label>가족</Label>
        <select
          name="groupId"
          required
          defaultValue=""
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        >
          <option value="" disabled>
            가족 선택
          </option>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>이름 목록</Label>
        <Textarea
          name="text"
          rows={8}
          placeholder={"김민수\n정하늘, 010-0000-0000"}
        />
      </div>
      <div>
        <Label>또는 파일</Label>
        <input name="file" type="file" accept=".csv,.txt,.xlsx,.xls" className="text-sm" />
      </div>
      <Button type="submit" disabled={pending || families.length === 0}>
        {pending ? "넣는 중" : "한꺼번에 넣기"}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {summary && <p className="text-sm text-stone-600">{summary}</p>}
    </form>
  );
}
