// 📁 /app/api/gerar-contrato-docx/route.ts

import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Buffer } from "buffer";

export async function POST(req: NextRequest) {
  try {
    // 🔽 Recebe o nome do template e os dados a serem preenchidos
    const { template, campos } = await req.json();

    // 🛑 Verifica se o nome do template e os dados são válidos
    if (!template || !template.endsWith(".docx") || !campos) {
      return NextResponse.json(
        { error: "Template .docx ou campos inválidos" },
        { status: 400 }
      );
    }

    // ☁️ Acessa o Firebase Storage buscando o template na pasta "templates/contratos"
    const fileRef = bucket.file(`templates/contratos/${template}`);
    const [fileBuffer] = await fileRef.download(); // Faz o download do arquivo

    // 📦 Cria uma instância zip do conteúdo do .docx
    const zip = new PizZip(fileBuffer);

    // 🧠 Inicializa o Docxtemplater para trabalhar com o .docx como template
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true, // Permite repetição de parágrafos
      linebreaks: true,    // Mantém quebras de linha
      delimiters: { start: "[[", end: "]]" }, // 👈 Define delimitadores personalizados
    });

    // 📥 Injeta os campos com os valores que serão substituídos no .docx
    doc.setData(campos);

    try {
      doc.render(); // 🧠 Faz a substituição dos campos no documento
    } catch (error: any) {
      console.error("Erro ao renderizar o contrato:", error);
      return NextResponse.json(
        { error: "Erro ao preencher o contrato", detalhe: String(error) },
        { status: 500 }
      );
    }

    // 📤 Gera um novo .docx com os campos preenchidos
    const buffer = doc.getZip().generate({
      type: "nodebuffer",       // Formato do retorno: buffer de Node
      compression: "DEFLATE",   // Compressão para reduzir o tamanho
    });

    // 📨 Retorna o arquivo para download com cabeçalhos corretos
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=contrato_preenchido.docx`,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao gerar contrato:", error);
    return NextResponse.json(
      { error: "Erro ao gerar contrato", detalhe: String(error) },
      { status: 500 }
    );
  }
}
