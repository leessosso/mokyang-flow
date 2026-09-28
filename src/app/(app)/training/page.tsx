import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";

export default function TrainingPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">훈련 프로그램</h2>
        <p className="mt-1 text-sm text-muted">
          같은 도메인의 훈련 프로그램 앱이 이 경로에 연결됩니다. (후속 PR:{" "}
          <code className="text-xs">/training</code> rewrite)
        </p>
      </div>

      <Card>
        <CardHeader
          title="준비 중"
          subtitle="출석·참여자·총무 기능은 class-management 연동 후 이 메뉴에서 이용할 수 있습니다."
        />
        <div className="px-4 py-4 sm:px-5">
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            리더 홈으로 돌아가기
          </Link>
        </div>
      </Card>
    </div>
  );
}
