# 2청년회 리더 운영

PWA 홈 화면에 표시되는 앱 이름은 **「2청년회 운영」** 입니다 (`public/manifest.webmanifest`).

2청년회 가장·임원·목사를 위한 주간 운영 도구입니다. 가족(구 "조")·가족원 관리, 리더 모임(교안·기도회·악보), 배정 모자(조 배정·자리 뽑기), 가족 단위 비공개 가족 보고, 가장 인수인계를 한곳에서 처리합니다.

## 데이터 저장 구조

이 앱은 SQLite/Prisma를 쓰지 않습니다. 로컬·배포 모두 **Firebase** 하나로 통일합니다.

| 무엇 | 어디에 |
|------|--------|
| 가족, 가장, 임원, 가족원, 리더 모임, 가족 보고 | **Firestore** (`src/lib/firebase-admin.ts`, `src/lib/store/*`) |
| 교안, 교안 해설지, 악보 파일 | **Firebase Storage** (`src/lib/storage.ts`) |
| 배정 모자 (조 배정·자리 뽑기) 실시간 상태 | 기존 **Realtime Database** (`public/sorting-hat/`, 변경 없음) |

클라이언트는 Firestore/Storage를 직접 읽지 않습니다. 서버 액션(`src/app/actions.ts`)과 서버 컴포넌트만 `firebase-admin`으로 접근하고, 권한은 NextAuth 세션으로 검사합니다. **웹 푸시(FCM)만** 브라우저에서 Firebase Messaging SDK와 서비스 워커를 사용하며, 구독 토큰은 서버가 Firestore `pushSubscriptions`에 저장합니다.

## 웹 푸시 (PWA + FCM) MVP

로그인 사용자(목사·관리자·가장)만 브라우저 푸시를 받을 수 있습니다. 가족원(계정 없음)은 대상이 아니며, 카카오톡 보고와 병행합니다.

같은 계정으로 삼성 인터넷과 설치형 PWA 등에서 각각 알림을 켜면 예전에는 토큰이 두 개 저장되어 동일 공지가 두 번 올 수 있었습니다. 지금은 **사용자당 최신 구독 토큰 하나**만 남기고, 발송·알림 tag로도 한 번만 보이도록 맞춥니다.

| 항목 | 설명 |
|------|------|
| PWA | `public/manifest.webmanifest`, `public/icons/*`, 대시보드에서 알림 켜기 |
| 서비스 워커 | `/firebase-messaging-sw.js` (환경 변수 기반 동적 스크립트) |
| 구독 저장 | Firestore `pushSubscriptions` — `{ userId, token, createdAt, lastSeenAt, userAgent? }`. **사용자당 최신 구독 토큰 하나만** 유지(브라우저·PWA 등에서 토큰이 바뀌면 이전 문서는 자동 삭제). |
| 발송 | `firebase-admin` `sendEachForMulticast` (`src/lib/push-notifications.ts`). 발송 시에도 사용자당 최신 토큰만 사용하고, 동일 이벤트는 `notification.tag`로 겹침을 방지합니다. |
| 트리거 | 가장(LEADER)이 가족 보고 메시지를 보내면 구독 중인 목사·관리자에게 푸시 → `/reports/{groupId}` |

**Firebase 콘솔 (배포 전)**

1. 프로젝트 설정 → 일반 → 내 앱 → 웹 앱이 없으면 추가 (또는 `public/sorting-hat/firebase-config.js`와 **동일 프로젝트** `sorting-hat-9d69e`면 해당 웹 앱 설정 재사용).
2. **Cloud Messaging** → Web Push certificates → Key pair 생성 → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`에 등록.
3. 서버용 서비스 계정(`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`)은 기존과 동일 프로젝트여야 FCM 발송이 됩니다. `FIREBASE_PROJECT_ID`와 `NEXT_PUBLIC_FIREBASE_PROJECT_ID`가 같아야 합니다.

**Vercel 환경 변수 (추가)**

```
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="....firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_VAPID_KEY="..."
```

`sorting-hat-9d69e`를 그대로 쓰는 경우 예시는 `public/sorting-hat/firebase-config.js`의 `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`와 동일하게 맞춥니다 (서비스 계정 키는 git에 넣지 않음).

**iOS**: Safari는 **홈 화면에 추가한 PWA**에서만 웹 푸시가 동작합니다. 일반 탭 브라우저만으로는 알림을 받을 수 없습니다.

**Phase 2 (섬김 · 본인 담당)**: `users.servingDutyKeys`에 로그인 사용자별 섬김 슬롯을 매핑하고, `leaderMeetings.dutyUserIds`(기도회 인도는 `prayerLeaderId`와 동기화)로 이번 모임 담당을 지정하면 해당 사용자에게 푸시 → `/meetings/{meetingId}`.

| 항목 | 설명 |
|------|------|
| 섬김 슬롯 | `prayer_meeting_lead`, `worship_usher`, `sorting_hat_facilitator` (`src/lib/types.ts` `SERVING_DUTIES`) |
| 매핑 UI | **가장·임원 관리** → 「섬김 담당 매핑」 |
| 배정 UI | **리더 모임** 상세 → 「섬김 담당 (이번 모임)」 |
| 트리거 | 담당 저장 시 담당자(`pushSubscriptions`)에게 「섬김 담당 · …」 푸시 (가족 보고 알림과 별도) |

**Phase 3 (출석 리마인더)**: 목사가 **오늘 날짜**로 주일을 열어 두었을 때, 담당 가족이 있는 **가장(LEADER)** 에게 주일 출석 입력을 알립니다. 목사·관리자는 출석 화면에서 QR·전체 합계를 다루므로 리마인더 대상이 아닙니다. 클릭 시 `/attendance/{sundayId}` (가장은 자동으로 자기 가족 화면으로 이동).

| 항목 | 설명 |
|------|------|
| 스케줄 | **매주 일요일 18:00 (Asia/Seoul)** — 주일 예배 후 가족원 출석을 입력하도록 유도 (`vercel.json` cron: 일요일 09:00 UTC) |
| 엔드포인트 | `GET /api/cron/attendance-reminder` |
| 인증 | `CRON_SECRET` — 요청 헤더 `Authorization: Bearer <CRON_SECRET>` (Vercel Cron이 동일 값으로 호출) |
| 멱등 | Firestore `settings/attendanceReminder` — `lastRemindedSundayId`로 같은 주일에 중복 발송 방지 |
| 조용히 건너뜀 | 오늘 주일 문서 없음 · 이미 알림 보냄 · 담당 가족 가장 없음 · 구독 토큰 없음 |

**Phase 4 (공지 브로드캐스트)**: 목사·관리자·2청년회 임원(회장~부회계)이 **공지** 메뉴에서 제목·본문·발송 대상을 작성하고, 임시저장 또는 **지금 보내기**로 FCM 웹 푸시를 보냅니다. 예약 발송은 없습니다. 클릭 시 `/announcements/{id}`.

| 항목 | 설명 |
|------|------|
| 권한 | `canManageAnnouncements` — PASTOR/ADMIN 또는 `officerTitle`이 8직책 중 하나 (담당 가족만 있는 일반 가장은 작성·발송 불가) |
| 대상 | `all` 알림 켠 로그인 사용자 전원 · `leaders` 담당 가족 있는 가장(LEADER) · `users` 체크리스트로 선택 |
| 데이터 | Firestore `announcements` — draft/sent, 발송 시 `pushSuccessCount` / `pushFailureCount` |
| UI | `/announcements` 목록 · `/announcements/new` 작성 · `/announcements/[id]` 상세·편집(임시저장만) |
| 멱등 | 이미 `sent`인 문서는 재발송 불가 (MVP) |

### 웹 푸시 테스트

1. Vercel(또는 로컬)에 위 `NEXT_PUBLIC_*` + VAPID + 기존 Firebase Admin env 설정.
2. `pastor@church.demo` 로 로그인 → **대시보드** → **알림 켜기** → 브라우저 권한 허용.
3. `leader1@church.demo` 로 로그인 → **가족 보고** → 1가족 방에 메시지 전송.
4. 목사 계정 기기/브라우저에 「가족 보고 · …」 푸시가 오고, 클릭 시 `/reports/{groupId}` 로 이동하는지 확인.

**섬김 담당 (Phase 2)**

1. `leader2@church.demo` 로 로그인 → **대시보드** → **알림 켜기**.
2. `pastor@church.demo` → **가장·임원 관리** → 박가장에 「리더 모임 전 기도회 인도」 체크 후 저장 (시드에 이미 있을 수 있음).
3. **리더 모임** → `3월 1주 리더 모임` → 「섬김 담당」에서 기도회 인도를 다른 가장으로 바꿔 저장하거나, 미지정이면 박가장으로 지정.
4. 박가장(또는 새 담당자) 기기에 「섬김 담당 · …」 푸시가 오고 `/meetings/{id}` 로 이동하는지 확인.

**출석 리마인더 (Phase 3, Cron)**

1. Vercel에 `CRON_SECRET`을 설정하고, 로컬 `.env`에도 같은 값을 넣습니다.
2. `pastor@church.demo`로 **출석** → 오늘 날짜로 「새 주일 열기」.
3. `leader1@church.demo` → **대시보드** → **알림 켜기**.
4. 로컬에서 Cron을 흉내 냅니다 (에뮬레이터·Firebase Admin env 필요):

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:43123/api/cron/attendance-reminder"
```

5. 응답이 `{"status":"sent",...}` 이고 가장 기기에 「주일 출석 · …」 푸시가 오는지 확인. 같은 주일에 다시 호출하면 `already_reminded_for_sunday`로 건너뜁니다.

배포 환경에서는 Vercel **Cron Jobs** 탭에서 `/api/cron/attendance-reminder` 실행 로그를 볼 수 있습니다.

**공지 브로드캐스트 (Phase 4)**

1. `pastor@church.demo` 또는 `officer1@church.demo`(총무)로 로그인 → **공지** → **새 공지 작성**.
2. 제목·본문 입력, 발송 대상 **가장** 선택 → **지금 보내기**.
3. `leader1@church.demo`로 로그인 → **대시보드** → **알림 켜기** (미설정 시).
4. 「공지 · …」 푸시가 오고 클릭 시 `/announcements/{id}` 로 열리는지 확인. 발송 화면에 푸시 성공/실패 건수가 표시됩니다.

## 요구 사항

- Node.js 20+
- npm
- Firebase 프로젝트 (Firestore + Storage 사용 설정) 또는 로컬 개발용 Firebase Emulator Suite

## 설치 및 실행

### 1) 환경 변수

`.env.example`을 참고해 `.env`를 만듭니다.

**로컬 개발 (에뮬레이터, 권장)**

Firestore와 Storage만 로컬에서 돌립니다. 프로젝트 ID는 `demo-`로 시작해야 실제 Firebase에 붙지 않고 데모 설정으로 동작합니다.

1. Firebase CLI를 설치합니다. 이미 있으면 건너뜁니다.

```bash
npm install -g firebase-tools
```

2. macOS에서는 Java가 필요합니다. Homebrew OpenJDK가 있어도 PATH에 없으면 에뮬레이터가 시작하지 않습니다.

```bash
brew install openjdk
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk"
```

3. 앱 폴더에서 에뮬레이터를 켭니다. 이 터미널은 켜 둔 채로 둡니다.

```bash
firebase emulators:start --only firestore,storage --project demo-mokyang-flow
```

준비되면 아래 주소로 붙습니다.

| 서비스 | 주소 |
|--------|------|
| 에뮬레이터 UI | [http://127.0.0.1:4000](http://127.0.0.1:4000) |
| Firestore | `127.0.0.1:8080` |
| Storage | `127.0.0.1:9199` |

에뮬레이터를 끄면 메모리에만 있던 데이터가 사라집니다. 다시 켠 뒤에는 `npm run db:seed`로 데모 데이터를 다시 넣습니다.

`.env`:

```
AUTH_SECRET="로컬 개발용 시크릿"
FIREBASE_PROJECT_ID="demo-mokyang-flow"
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_STORAGE_EMULATOR_HOST="127.0.0.1:9199"
FIREBASE_STORAGE_BUCKET="demo-mokyang-flow.appspot.com"
```

**실제 Firebase 프로젝트 연결 (배포용)**

Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후:

```
AUTH_SECRET="프로덕션에서 반드시 교체"
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@....iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="....appspot.com"
```

### 2) 설치·시드·실행

에뮬레이터가 켜진 상태에서 다른 터미널로 실행합니다.

```bash
npm install
npm run db:seed   # scripts/seed.ts — Firestore에 데모 데이터 기록
npm run dev
```

브라우저에서 [http://localhost:43123](http://localhost:43123) 으로 접속합니다.

## 데모 계정

비밀번호는 모두 `demo1234` 입니다.

| 역할 | 이메일 | 설명 |
|------|--------|------|
| 목사 | `pastor@church.demo` | 전체 가족·가족 보고·인수인계·임원 관리 |
| 1가족 가장 | `leader1@church.demo` | 1가족 담당 |
| 2가족 가장 (회장 겸임) | `leader2@church.demo` | 2가족 담당, 임원 회장 겸임, 기도회 인도자 |
| 3가족 가장 | `leader3@church.demo` | 3가족 담당 (이전 가장 이력 포함) |
| 임원 전용 (총무) | `officer1@church.demo` | 담당 가족 없이 임원 직책만 있는 계정 |

시드 데이터에는 3개 가족, 10명 가족원, 리더 모임 1건(기도회 인도자 지정 포함), 1가족 보고 방(가족원 태그 메시지 2건)이 포함됩니다.

## 주요 기능

- **가족·가족원**: 1년에 상반기·하반기 두 번 구성합니다. 목사가 그 학기 가족을 만들고 가족원을 배정하며, 가장은 `내 가족`에서 가족원을 추가할 수 있습니다. `가장·임원 관리`에서 다음 학기를 열면 이전 가족은 남겨 두고 새로 짭니다.
- **임원**: 회장·부회장·총무·부총무·서기·부서기·회계·부회계 8직책. `가장·임원 관리`에서 목사가 지정합니다. 임원이 가장을 겸임할 수 있습니다.
- **리더 모임**: 가장들 + 임원 + 목사가 매주 모입니다. 모임 상세에서 교안·교안 해설지를 목사가 올리고, 기도회 인도자를 지정하면 그 인도자만 악보를 올릴 수 있습니다. 현장 배정은 배정 모자로 연결됩니다.
- **가족 보고**: 가장이 가족원을 태그해 글을 남기면, 목사와 그 가장만 보는 **가족 단위 한 방**에 쌓입니다. 다른 가장은 볼 수 없습니다. (카카오톡 1:1 보고를 대체)
- **가장 인수인계**: 목사가 `가장·임원 관리`에서 새 가장을 임명하면 이력이 남고, 가족원·가족 보고 방은 가족 기준으로 유지되어 새 가장이 계속 열람·작성할 수 있습니다.
- **배정 모자**: 리더 모임 현장에서 오늘 출석 임원 수만큼 조를 만들고 가장을 배정·자리 뽑기 합니다. 로그인한 메뉴(`/hat`, `/hat/admin`)에서 헤더 아래에 열립니다. 현장용 공개 URL도 있습니다.
- **출석**(`/attendance`): 목사가 주일을 열면, 가장이 자기 가족원마다 1-3부/4부 참석·방송과 4부 이후 가족모임 참석 여부를 체크합니다. QR은 교회 출입 명단(CSV/xlsx)을 목사가 올려 자동으로 켜지고, 동명이인·미매칭은 목사가 가족 화면에서 직접 켤 수 있습니다.
- **참여조사**(`/surveys`): 식수 조사 같은 일회성 행사 참여 인원 조사를 목사가 만들고(예/아니오·인원·메모 질문 조합), 가장이 가족원을 대신해 응답합니다. 목사는 가족별 응답률과 합계를 봅니다.

## 배정 모자

기존 Firebase Realtime Database를 그대로 씁니다. 본 앱의 Firestore와는 별개 데이터입니다 (동시성이 필요한 현장 배정만 RTDB에 둡니다).

`public/sorting-hat/firebase-config.js`에 sorting-hat RTDB용 **웹 클라이언트 설정**이 포함되어 있어 Vercel 등 배포 환경에서도 바로 동작합니다 (Firebase가 브라우저에 노출하도록 설계한 공개 값이며, 서비스 계정 키와는 별개입니다). 다른 Firebase 프로젝트로 바꿀 때만 `firebase-config.example.js`를 참고해 값을 수정합니다.

| 화면 | URL |
|------|-----|
| 조 배정·자리 뽑기 (메뉴) | [http://localhost:43123/hat](http://localhost:43123/hat) |
| 관리자 (메뉴) | [http://localhost:43123/hat/admin](http://localhost:43123/hat/admin) |
| 조 배정·자리 뽑기 (공개) | [http://localhost:43123/sorting-hat/index.html](http://localhost:43123/sorting-hat/index.html) |
| 관리자 (공개) | [http://localhost:43123/sorting-hat/admin.html](http://localhost:43123/sorting-hat/admin.html) |

관리자 비밀 메뉴 기본 비밀번호는 `7777`입니다. 이후 리더 운영 앱의 목사/ADMIN 세션과 연계할 예정입니다.

## 데모 시나리오

### 1. 가족 보고 (가장 → 목사, 가족원 태그)

1. `leader1@church.demo` 로 로그인
2. **내 가족** 또는 **가족 보고** → 1가족 선택
3. 가족원을 태그하거나 "가족 전체"로 새 메시지 작성 후 전송
4. 로그아웃 후 `pastor@church.demo` 로 로그인
5. **가족 보고** → 1가족 방에서 답장 (같은 방에 이어짐)

### 2. 리더 모임 (교안·기도회·배정 모자)

1. `pastor@church.demo` 로 로그인 → **리더 모임** → `3월 1주 리더 모임`
2. 교안·교안 해설지 업로드, 기도회 인도자 지정
3. `leader2@church.demo`(지정된 인도자)로 로그인해 악보 업로드
4. **현장 배정** 카드에서 배정 모자로 이동해 조 배정·자리 뽑기 진행

### 3. 가장 인수인계 + 임원 지정

1. `pastor@church.demo` → **가장·임원 관리**
2. 임원 직책 표에서 리더 계정에 회장~부회계 지정
3. 1가족의 새 가장으로 `최신가장(leader3)` 선택 후 실행
4. `leader3@church.demo` 로 로그인 → **가족 보고**에서 1가족 방 확인

## 기술 스택

- Next.js (App Router), TypeScript, Tailwind CSS
- NextAuth (이메일·비밀번호, Firestore 유저 검증)
- Firebase Admin SDK (Firestore + Storage)
- Firebase Cloud Messaging (웹 푸시, PWA 서비스 워커)

## 배포 (Vercel)

Vercel은 서버리스라 디스크가 유지되지 않습니다. 로컬 파일이나 SQLite는 쓰지 않으므로 별도 마이그레이션 없이 그대로 배포할 수 있습니다.

1. Vercel 프로젝트에 `.env.example`의 Firebase 서비스 계정 환경 변수를 등록합니다 (에뮬레이터 변수는 제외).
2. `AUTH_SECRET`을 반드시 새 값으로 교체합니다.
3. 출석 리마인더 Cron용 `CRON_SECRET`을 등록합니다 (Vercel이 Cron 호출 시 `Authorization: Bearer`로 전달).
4. Firebase 콘솔에서 Firestore 보안 규칙을 "모든 클라이언트 접근 거부"로 유지합니다 — 이 앱은 서버(firebase-admin)로만 접근하므로 클라이언트 규칙을 열 필요가 없습니다.
