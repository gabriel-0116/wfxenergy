// ✅ /api/listar-templates/route.ts
import { NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";

export async function GET() {
  try {
    // Lista arquivos da pasta 'templates/'
    const [files] = await bucket.getFiles({ prefix: "templates/" });

    // Filtra somente arquivos válidos e não pastas
    const nomes = files
      .filter((file) => file.name !== "templates/") // exclui o diretório
      .map((file) => file.name.replace("templates/", ""));

    return NextResponse.json({ arquivos: nomes });
  } catch (error) {
    console.error("❌ Erro ao listar templates:", error);
    return NextResponse.json({ error: "Erro ao listar arquivos." }, { status: 500 });
  }
}
