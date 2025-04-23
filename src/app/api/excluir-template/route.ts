// 📁 app/api/excluir-template/route.ts

import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// ✅ Inicializa o Firebase Admin apenas uma vez
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)),
    storageBucket: "wfxenergy-5cb37.firebasestorage.app", // 🪣 seu bucket
  });
}

export async function DELETE(req: NextRequest) {
  try {
    console.log("🚨 ROTA ATIVADA - DELETE /api/excluir-template");
console.log("🔎 Params:", req.nextUrl.searchParams.toString());

    // 👉 Lê o tipo da query: ?tipo=proposta ou ?tipo=contrato
    const tipo = req.nextUrl.searchParams.get("tipo") || "proposta";
    if (!["proposta", "contrato"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use 'proposta' ou 'contrato'." },
        { status: 400 }
      );
    }

    // 👉 Lê o nome do arquivo da query: ?nomeArquivo=exemplo.docx
    const nomeArquivo = req.nextUrl.searchParams.get("nomeArquivo");
    if (!nomeArquivo) {
      return NextResponse.json(
        { error: "Nome do arquivo não informado" },
        { status: 400 }
      );
    }

    const bucket = getStorage().bucket();

    // 🧹 Caminho completo do arquivo a ser deletado
    const caminho = `templates/${tipo}s/${nomeArquivo}`;
    console.log("🗑 Deletando:", caminho);
    const file = bucket.file(caminho);

    await file.delete();

    return NextResponse.json({ success: true, deleted: caminho });

  } catch (error: any) {
    console.error("❌ Erro ao excluir arquivo do Storage:", error);
    return NextResponse.json(
      { error: "Erro ao excluir template" },
      { status: 500 }
    );
  }
}
