import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPhWe234EJ5_5He2nqqrjBiysBDqkjKFc",
  authDomain: "bingo-d0bf7.firebaseapp.com",
  projectId: "bingo-d0bf7",
  storageBucket: "bingo-d0bf7.firebasestorage.app",
  messagingSenderId: "285712424353",
  appId: "1:285712424353:web:a8dcdfe1f5d999b716ffe0",
  measurementId: "G-2B21XGL2DT",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();
  return supported ? getAnalytics(app) : null;
}
