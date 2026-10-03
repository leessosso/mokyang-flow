# `/tongdok` → tongdok-mu (same-domain rewrite)

훈련(`/training`)과 동일 패턴: 통독 앱은 mokyang-flow(youth2-space)와 **같은 도메인**의 `/tongdok` path로 tongdok-mu에 붙인다. iframe·UI 이식 없음. **로그인·SSO는 훈련과 합치지 않음** (통독 앱 자체 인증).

## 환경 변수

| 변수 | 설명 |
|------|------|
| `TONGDOK_ORIGIN` | tongdok-mu 배포 origin (scheme + host, **path 없음**). 예: `https://tongdok-mu.vercel.app` |

- **프로덕션**: env 미설정 시 기본값 `https://tongdok-mu.vercel.app` (next.config).
- **로컬**: env 없으면 rewrite 비활성 → `/tongdok`은 Next 라우트가 없어 404. 프록시 테스트 시 `.env.local`에 origin 설정.
- **끄기**: `TONGDOK_ORIGIN=` (빈 문자열)로 명시하면 rewrite 생략.

## Rewrite 매핑

`next.config.ts`는 통독 규칙을 **`beforeFiles`**에 넣어, 셸이 `/tongdok.rsc` 같은 flight URL을 자체 App Router RSC로 해석하지 않고 upstream으로 보냅니다.

| mokyang-flow (source) | upstream path (destination) |
|----------------------|-----------------------------|
| `/tongdok` | `/tongdok` |
| `/tongdok/:path*` | `/tongdok/:path*` (일반 자산·라우트) |
| `/tongdok.rsc` | `/tongdok.rsc` |
| `/tongdok/tongdok.rsc` | **`/tongdok.rsc`** (basePath 루트 flight — `/tongdok`을 두 번 붙이지 않음) |

예: `TONGDOK_ORIGIN=https://tongdok-mu.vercel.app` →  
`/tongdok/foo` → `https://tongdok-mu.vercel.app/tongdok/foo`  
`/tongdok/tongdok.rsc` → `https://tongdok-mu.vercel.app/tongdok.rsc` (동일 호스트에서 tongdok-mu에 직접 요청할 때와 같은 path)

`TONGDOK_ORIGIN`에 `/tongdok` path가 실수로 포함돼도 `normalizeTongdokOrigin`이 제거해 `{origin}/tongdok/tongdok/...` 이중 prefix를 막습니다.

## tongdok-mu 쪽 기대 설정

1. **`basePath: '/tongdok'`** — tongdok-mu 레포에서 별도 PR로 적용.  
   - **프로덕션 end-to-end는 basePath 배포 후**에만 정상 동작한다.  
   - 현재 라이브 origin은 basePath 없이 루트(`/`)만 있을 수 있어, shell rewrite만 올려도 `/tongdok`은 404·깨진 asset이 날 수 있다.

2. **정적 자산**  
   - basePath 적용 시 JS/CSS는 `/tongdok/_next/...`로 노출된다. mokyang-flow rewrite가 `/tongdok/:path*`로 함께 전달한다.

3. **단독 URL**  
   - `https://tongdok-mu.vercel.app` 직접 접속은 shell에서 막거나 리다이렉트하지 않는다. 내비 링크만 `/tongdok`으로 통일한다.

## 검증 (tongdok-mu basePath 배포 후)

1. 같은 탭에서 `https://<mokyang-flow-host>/tongdok` (또는 내비 **통독으로 가기**).
2. Network: document·`_next` 요청이 mokyang-flow host의 `/tongdok/...`로 가고 200.
3. tongdok-mu 단독 URL `{TONGDOK_ORIGIN}/tongdok`과 동일 화면.

## 훈련 SSO와의 관계

- `/api/platform/training-sso`, `TRAINING_ORIGIN` rewrite는 기존과 동일.
- 통독에는 SSO 티켓 엔트리를 추가하지 않는다 (이 슬라이스 범위).

## NextAuth 미들웨어

`src/auth.config.ts`의 `authorized`는 `isTongdokShellPublicPath`로 `/tongdok`, `/tongdok/*`, `/tongdok.rsc` 등 flight URL을 **셸 로그인 없이** 통과시킨다 (rewrite가 tongdok-mu로 전달). 비밀번호 변경 강제(`mustChangePassword`) 리다이렉트도 통독 prefix에서는 적용하지 않는다.
