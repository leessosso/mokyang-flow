import { generateKeyPairSync } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function usingEmulator() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  );
}

/**
 * Firestore Admin은 인증서 자격 증명이 있어야 클라이언트를 만든다.
 * 에뮬레이터에서 ADC(메타데이터 서버)를 쓰지 않도록, 프로세스 안에서만 쓰는 RSA 키를 만든다.
 * 이 키는 클라우드에 올리지 않으며, 에뮬레이터가 서명 검증을 하지 않아 동작한다.
 */
function emulatorCertificate(projectId: string) {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return cert({
    projectId,
    clientEmail: `firebase-adminsdk@${projectId}.iam.gserviceaccount.com`,
    privateKey,
  });
}

let app: App | undefined;
let firestore: Firestore | undefined;
let storageBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]> | undefined;

/**
 * 본 앱(가족·가장·리더모임·가족 보고)의 유일한 데이터 계층입니다.
 * Firestore를 관계형 데이터에, Storage를 교안/해설지/악보 파일에 씁니다.
 * 배정 모자(public/sorting-hat)는 별도로 Realtime Database를 씁니다 — 여기서 다루지 않습니다.
 *
 * 초기화는 첫 사용 시점에만 수행합니다. `next build`의 페이지 데이터 수집 단계에서는
 * Firebase env가 없어도 import만으로 실패하지 않습니다.
 */
export function ensureApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-mokyang-flow";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`;

  process.env.GOOGLE_CLOUD_PROJECT ??= projectId;
  process.env.GCLOUD_PROJECT ??= projectId;

  if (usingEmulator()) {
    app = initializeApp({
      projectId,
      storageBucket: bucketName,
      credential: emulatorCertificate(projectId),
    });
    return app;
  }

  if (clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: bucketName,
    });
    return app;
  }

  throw new Error(
    "Firebase 설정이 없습니다. 로컬은 FIRESTORE_EMULATOR_HOST를, 배포는 FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY를 넣으세요.",
  );
}

export function getDb(): Firestore {
  if (!firestore) firestore = getFirestore(ensureApp());
  return firestore;
}

export function getBucket() {
  if (!storageBucket) storageBucket = getStorage(ensureApp()).bucket();
  return storageBucket;
}
