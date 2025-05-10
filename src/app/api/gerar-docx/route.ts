// 📁 /app/api/gerar-docx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Buffer } from "buffer";

export async function POST(req: NextRequest) {
  try {
    // 🔽 Extrai o nome do template (com subpasta) e os dados
    const { template, campos } = await req.json();

    // ⚠️ Verifica se está tudo preenchido corretamente
    if (!template || !template.endsWith(".docx") || !campos) {
      return NextResponse.json(
        { error: "Template .docx ou campos inválidos" },
        { status: 400 }
      );
    }

    // ☁️ Acessa o Firebase Storage com o caminho completo do template
    const fileRef = bucket.file(`templates/${template}`);
    const [fileBuffer] = await fileRef.download();

    // 📦 Inicializa o ZIP com o conteúdo .docx
    const zip = new PizZip(fileBuffer);

    // 🧩 Configura o Docxtemplater para preencher com dados
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "[[", end: "]]" },
    });

    // 📥 Injeta os dados nos campos do template
    doc.setData(campos);

    try {
      doc.render(); // 🧠 Preenche o template com os dados
    } catch (error: any) {
      console.error("Erro ao renderizar o .docx:", error);
      return NextResponse.json(
        { error: "Erro ao preencher o template", detalhe: String(error) },
        { status: 500 }
      );
    }

    // 📤 Gera o buffer do novo .docx preenchido
    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=documento_preenchido.docx`,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao gerar .docx:", error);
    return NextResponse.json(
      { error: "Erro ao gerar documento", detalhe: String(error) },
      { status: 500 }
    );
  }
}
