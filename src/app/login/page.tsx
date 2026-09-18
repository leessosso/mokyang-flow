import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            2청년회
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">조장 운영</h1>
          <p className="mt-2 text-sm text-stone-600">
            조장·목사 전용 운영 도구입니다.
          </p>
        </div>
        <form
          action={async (formData) => {
            "use server";
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;
            await signIn("credentials", {
              email,
              password,
              redirectTo: "/dashboard",
            });
          }}
          className="space-y-4"
        >
          <div>
            <Label>이메일</Label>
            <Input name="email" type="email" required placeholder="leader1@church.demo" />
          </div>
          <div>
            <Label>비밀번호</Label>
            <Input name="password" type="password" required placeholder="demo1234" />
          </div>
          <Button type="submit" className="w-full">로그인</Button>
        </form>
        <div className="mt-6 rounded-lg bg-stone-50 p-4 text-xs text-stone-600">
          <p className="font-medium text-stone-800">데모 계정</p>
          <ul className="mt-2 space-y-1">
            <li>목사: pastor@church.demo</li>
            <li>1조 조장: leader1@church.demo</li>
            <li>2조 조장: leader2@church.demo</li>
            <li>비밀번호: demo1234</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
