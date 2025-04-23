// app/api/download-template/route.ts
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { initializeApp, cert, getApps } from "firebase-admin/app";

// Inicializa Firebase Admin se ainda não foi
if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("A variável FIREBASE_SERVICE_ACCOUNT_BASE64 está ausente.");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8")
  );

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}


export async function POST(req: Request) {
  try {
    const { template } = await req.json();

    if (!template) {
      return NextResponse.json(
        { error: "Template não informado" },
        { status: 400 }
      );
    }

    const bucket = getStorage().bucket();
    const file = bucket.file(`templates/propostas/${template}`);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: "Arquivo não encontrado no storage" },
        { status: 404 }
      );
    }

    const [buffer] = await file.download();
    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${template}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar template:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
