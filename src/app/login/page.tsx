import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 lg:justify-start lg:px-0">
      <div className="hidden h-screen w-[42%] max-w-xl flex-col justify-end bg-stone-800 px-12 py-16 text-stone-100 lg:flex">
        <h1 className="text-4xl font-semibold">2청년회 운영</h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-stone-300">
          리더 모임 자료, 배정 모자, 가족 보고를 한곳에서 관리합니다.
        </p>
      </div>
      <Card className="w-full max-w-md p-6 sm:p-8 lg:ml-16 xl:ml-24">
        <div className="mb-6 text-center lg:text-left">
          <h1 className="text-2xl font-semibold text-stone-900">
            <span className="lg:hidden">2청년회 운영</span>
            <span className="hidden lg:inline">로그인</span>
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            가장·임원·목사 전용 운영 도구입니다.
          </p>
        </div>
        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            이메일 또는 비밀번호가 올바르지 않습니다. 아래 데모 계정을 확인해 주세요.
          </p>
        ) : null}
        <form
          action={async (formData) => {
            "use server";
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;
            try {
              await signIn("credentials", {
                email,
                password,
                redirectTo: "/dashboard",
              });
            } catch (err) {
              if (err instanceof AuthError) {
                redirect("/login?error=credentials");
              }
              throw err;
            }
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
            <li>1가족 가장: leader1@church.demo</li>
            <li>2가족 가장(회장 겸임): leader2@church.demo</li>
            <li>비밀번호: demo1234</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
