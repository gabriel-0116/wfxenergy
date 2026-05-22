// 📁 app/api/upload-template/route.ts

import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin"; // ✅ Firebase Admin SDK inicializado

export async function POST(req: NextRequest) {
  try {
    console.log("📩 Iniciando upload de template...");

    // 👉 Lê o parâmetro ?tipo=contrato ou ?tipo=proposta (default: proposta)
    const tipo = req.nextUrl.searchParams.get("tipo") || "proposta";
    if (!["proposta", "contrato"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use 'proposta' ou 'contrato'." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    console.log("🧾 Nome do arquivo:", file?.name);
    console.log("🧾 Tipo do arquivo:", file?.type);

    if (
      !file ||
      (
        !file.name.endsWith(".docx") &&
        !file.name.endsWith(".html") &&
        !file.name.endsWith(".htm") &&
        !file.name.endsWith(".pdf")
      )
    ) {
      return NextResponse.json(
        { error: "Arquivo inválido. Envie um .docx, .html, .htm ou .pdf" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const maxSize = 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 5MB)" },
        { status: 413 }
      );
    }

    // 📁 Caminho atualizado conforme o tipo (proposta ou contrato)
    const destination = `templates/${tipo}s/${file.name}`;
    const fileRef = bucket.file(destination);

    await fileRef.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      public: true, // 🔓 torna público para permitir download direto
    });

    return NextResponse.json({
      message: `Upload de template (${tipo}) realizado com sucesso!`,
      nomeArquivo: file.name,
      caminho: destination,
    });

  } catch (error: any) {
    console.error("❌ ERRO NO UPLOAD:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do template" },
      { status: 500 }
    );
  }
}
