import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import serviceAccount from "./serviceAccountKey.json";

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = getStorage().bucket();

export { bucket };
