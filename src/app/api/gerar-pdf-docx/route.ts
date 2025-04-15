// 📁 /app/api/gerar-pdf-docx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Buffer } from "buffer";

export async function POST(req: NextRequest) {
  try {
    // 🔽 Recebe o nome do template e os campos (placeholders + valores)
    const { template, campos } = await req.json();

    if (!template || !template.endsWith(".docx") || !campos) {
      return NextResponse.json(
        { error: "Template .docx ou campos inválidos" },
        { status: 400 }
      );
    }

    // ☁️ Busca o template do Firebase Storage
    const fileRef = bucket.file(`templates/${template}`);
    const [fileBuffer] = await fileRef.download();

    // 📦 Inicializa o ZIP com o conteúdo .docx
    const zip = new PizZip(fileBuffer);

    // 🧩 Inicializa o Docxtemplater com o ZIP
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 📥 Injeta os dados nos placeholders do template
    doc.setData(campos);

    try {
      doc.render(); // 🧠 Processa os dados e substitui os placeholders
    } catch (error: any) {
      console.error("Erro ao renderizar docx:", error);
      return NextResponse.json(
        { error: "Erro ao preencher o template", detalhe: String(error) },
        { status: 500 }
      );
    }

    // 📤 Gera o novo .docx preenchido
    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=proposta_preenchida.docx`,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao gerar proposta .docx:", error);
    return NextResponse.json(
      { error: "Erro ao gerar proposta", detalhe: String(error) },
      { status: 500 }
    );
  }
}
