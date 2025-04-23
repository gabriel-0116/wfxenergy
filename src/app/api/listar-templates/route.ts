// ✅ /api/listar-templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    // 📌 Lê o parâmetro ?tipo=proposta ou ?tipo=contrato (default: proposta)
    const tipo = req.nextUrl.searchParams.get("tipo") || "proposta";
    if (!["proposta", "contrato"].includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use 'proposta' ou 'contrato'." },
        { status: 400 }
      );
    }

    // 📂 Prefixo da pasta correta no Storage
    const prefixo = `templates/${tipo}s/`;

    // 📋 Busca arquivos da pasta correspondente
    const [files] = await bucket.getFiles({ prefix: prefixo });

    // 🧽 Limpa os resultados para exibir só nomes de arquivos (sem pasta)
    const nomes = files
      .filter((file) => file.name !== prefixo) // evita incluir o "diretório" em si
      .map((file) => file.name.replace(prefixo, "")); // retorna apenas o nome do arquivo

    return NextResponse.json({ arquivos: nomes });

  } catch (error) {
    console.error("❌ Erro ao listar templates:", error);
    return NextResponse.json({ error: "Erro ao listar arquivos." }, { status: 500 });
  }
}
