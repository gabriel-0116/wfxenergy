import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// 🔐 Decodifica o service account vindo do .env
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!,
  "base64"
).toString("utf8");

const serviceAccount = JSON.parse(decoded);

// 🔄 Inicializa o app se ainda não estiver inicializado
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // 👈 VARIÁVEL PRIVADA
  });
}

// 🎯 Pega o bucket e exporta
const bucket = getStorage().bucket();

export { bucket };
