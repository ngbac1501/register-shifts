import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "@/config/firebase";

// Prevent re-initialization in Next.js hot reload
function getFirebaseApp() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

export const firebaseApp = getFirebaseApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
