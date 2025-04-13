import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!,
  "base64"
).toString("utf8");

const serviceAccount = JSON.parse(decoded);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = getStorage().bucket();

export { bucket };
