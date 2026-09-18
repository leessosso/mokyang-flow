"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendPastoralMessage } from "@/app/actions";
import { Button, Textarea } from "@/components/ui";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; role: string };
};

export function PastoralThread({
  memberId,
  memberName,
  messages,
}: {
  memberId: string;
  memberName: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await sendPastoralMessage(memberId, body);
    if (res.error) {
      setError(res.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-stone-600">
        <span className="font-medium text-stone-900">{memberName}</span>에 대한 비공개 대화
      </p>
      <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-stone-500">첫 양육 보고를 작성해 주세요.</p>
        )}
        {messages.map((m) => {
          const isPastor = m.author.role === "PASTOR" || m.author.role === "ADMIN";
          return (
            <div
              key={m.id}
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                isPastor
                  ? "ml-auto bg-sky-100 text-sky-950"
                  : "bg-white text-stone-900 shadow-sm"
              }`}
            >
              <p className="text-xs font-medium opacity-70">{m.author.name}</p>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(m.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="양육 상황, 기도 제목, 상담 요청 등"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit">보내기</Button>
      </form>
    </div>
  );
}
