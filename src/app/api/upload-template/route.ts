// 📁 app/api/upload-template/route.ts

import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin"; // ✅ Firebase Admin SDK inicializado com permissões de upload

export async function POST(req: NextRequest) {
  try {
    // 📦 Recebe o arquivo via formulário (multipart/form-data)
    console.log("📩 Iniciando upload de template...");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    console.log("🧾 Nome do arquivo:", file?.name);
    console.log("🧾 Tipo do arquivo:", file?.type);

    // 🛑 Validação: o arquivo deve ser .docx, .html, .htm ou .pdf
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
        { error: "Arquivo inválido. Envie um .docx, .html ou .pdf" },
        { status: 400 }
      );
    }

    // 📤 Converte o arquivo para buffer para fazer upload no Firebase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 📏 Limite de tamanho: máximo 5MB
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande (max 5MB)" },
        { status: 413 }
      );
    }

    // 📁 Define o caminho de destino no Firebase Storage
    const destination = `templates/${file.name}`;
    const fileRef = bucket.file(destination);
    
    await fileRef.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      public: true, // precisa estar público se for baixado depois via link direto
    });
    

    // ✅ Resposta de sucesso
    return NextResponse.json({
      message: "Upload realizado com sucesso!",
      nomeArquivo: file.name,
    });

  } catch (error: any) {
    console.error("❌ ERRO NO UPLOAD:", error);

    // 🚨 Resposta de erro genérica
    return NextResponse.json(
      { error: "Erro ao fazer upload do template" },
      { status: 500 }
    );
  }
}
