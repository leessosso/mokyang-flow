# 2청년회 리더 운영

2청년회 가장·임원·목사를 위한 주간 운영 도구입니다. 가족(구 "조")·가족원 관리, 리더 모임(교안·기도회·악보), 배정 모자(조 배정·자리 뽑기), 가족 단위 비공개 가족 보고, 가장 인수인계를 한곳에서 처리합니다.

## 데이터 저장 구조

이 앱은 SQLite/Prisma를 쓰지 않습니다. 로컬·배포 모두 **Firebase** 하나로 통일합니다.

| 무엇 | 어디에 |
|------|--------|
| 가족, 가장, 임원, 가족원, 리더 모임, 가족 보고 | **Firestore** (`src/lib/firebase-admin.ts`, `src/lib/store/*`) |
| 교안, 교안 해설지, 악보 파일 | **Firebase Storage** (`src/lib/storage.ts`) |
| 배정 모자 (조 배정·자리 뽑기) 실시간 상태 | 기존 **Realtime Database** (`public/sorting-hat/`, 변경 없음) |

클라이언트는 Firestore/Storage를 직접 읽지 않습니다. 서버 액션(`src/app/actions.ts`)과 서버 컴포넌트만 `firebase-admin`으로 접근하고, 권한은 NextAuth 세션으로 검사합니다.

## 요구 사항

- Node.js 20+
- npm
- Firebase 프로젝트 (Firestore + Storage 사용 설정) 또는 로컬 개발용 Firebase Emulator Suite

## 설치 및 실행

### 1) 환경 변수

`.env.example`을 참고해 `.env`를 만듭니다.

**로컬 개발 (에뮬레이터, 권장)**

```bash
npm install -g firebase-tools   # 최초 1회
`firebase emulators:start --only firestore,storage --project demo-mokyang-flow`

에뮬레이터 UI는 [http://127.0.0.1:4000](http://127.0.0.1:4000) 입니다. macOS에서는 Java가 필요합니다. Homebrew로 `brew install openjdk` 한 뒤:

```bash
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk"
```
```

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

로컬에서 쓰려면 `public/sorting-hat/firebase-config.example.js`를 `public/sorting-hat/firebase-config.js`로 복사한 뒤 Firebase 값을 넣습니다.

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

## 배포 (Vercel)

Vercel은 서버리스라 디스크가 유지되지 않습니다. 로컬 파일이나 SQLite는 쓰지 않으므로 별도 마이그레이션 없이 그대로 배포할 수 있습니다.

1. Vercel 프로젝트에 `.env.example`의 Firebase 서비스 계정 환경 변수를 등록합니다 (에뮬레이터 변수는 제외).
2. `AUTH_SECRET`을 반드시 새 값으로 교체합니다.
3. Firebase 콘솔에서 Firestore 보안 규칙을 "모든 클라이언트 접근 거부"로 유지합니다 — 이 앱은 서버(firebase-admin)로만 접근하므로 클라이언트 규칙을 열 필요가 없습니다.
