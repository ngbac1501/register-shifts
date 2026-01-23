import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
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

export async function createUserInSecondaryApp(email: string, pass: string) {
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    return userCredential.user;
  } finally {
    // Clean up to avoid memory leaks
    await deleteApp(secondaryApp);
  }
}
