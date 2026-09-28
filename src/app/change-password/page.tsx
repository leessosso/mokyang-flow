import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { changePasswordAction } from "@/app/auth-actions";
import { Button, Card, Input, Label } from "@/components/ui";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.mustChangePassword) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-stone-900">비밀번호 변경</h1>
        <p className="mt-2 text-sm text-stone-600">
          운영자가 설정한 초기 비밀번호로 로그인했습니다. 계속하려면 새 비밀번호를 설정해 주세요.
        </p>
        {error === "mismatch" ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            새 비밀번호가 일치하지 않습니다.
          </p>
        ) : null}
        {error === "weak" ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            비밀번호는 8자 이상이어야 합니다.
          </p>
        ) : null}
        {error === "same" ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            초기 비밀번호와 다른 비밀번호를 입력해 주세요.
          </p>
        ) : null}
        <form action={changePasswordAction} className="mt-6 space-y-4">
          <div>
            <Label>새 비밀번호</Label>
            <Input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>새 비밀번호 확인</Label>
            <Input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full">변경하고 계속</Button>
        </form>
      </Card>
    </div>
  );
}
