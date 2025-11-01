// firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ 환경변수 사용 (Vercel에서도 동일 키로 설정)
const firebaseConfig = {
  apiKey: "AIzaSyBNly1H7BlG6M8vRqnSp4aHpaSrw8UpEa8",
  authDomain: "matcheat-507ee.firebaseapp.com",
  projectId: "matcheat-507ee",
  storageBucket: "matcheat-507ee.firebasestorage.app",
  messagingSenderId: "479776540391",
  appId: "1:479776540391:web:1d1da3d31d5edf303bc442",
  measurementId: "G-J0NVDHWTTX"
  // measurementId는 브라우저에서만 쓰므로 여기선 생략해도 OK
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 공용(SSR/CSR)에서 안전
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 🔸 Analytics는 브라우저에서만, 필요할 때만 동적 로드
export async function getAnalyticsClient() {
  if (typeof window === "undefined") return null;
  const { getAnalytics } = await import("firebase/analytics");
  try {
    return getAnalytics(app);
  } catch {
    return null;
  }
}
