import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

export type ClientFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

/** 브라우저 FCM용 공개 설정 (Vercel `NEXT_PUBLIC_FIREBASE_*`). */
export function getClientFirebaseConfig(): ClientFirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, messagingSenderId, appId };
}

export function getWebPushVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? null;
}

export function isWebPushConfigured(): boolean {
  return getClientFirebaseConfig() !== null && getWebPushVapidKey() !== null;
}

let clientApp: FirebaseApp | undefined;

export function getClientFirebaseApp(): FirebaseApp {
  if (clientApp) return clientApp;
  const config = getClientFirebaseConfig();
  if (!config) {
    throw new Error("NEXT_PUBLIC_FIREBASE_* 환경 변수가 설정되지 않았습니다.");
  }
  clientApp = getApps().length ? getApp() : initializeApp(config);
  return clientApp;
}
