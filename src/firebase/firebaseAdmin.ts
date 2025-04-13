// ✅ src/firebase/firebaseAdmin.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// 🔄 Converte a string da env, tratando as quebras de linha
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY!;
const serviceAccount = JSON.parse(rawServiceAccount.replace(/\\n/g, '\n'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = getStorage().bucket();

export { bucket };
