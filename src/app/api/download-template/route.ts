// /api/download-template/route.ts
import { bucket } from "@/firebase/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { template } = await req.json();

  if (!template) {
    return NextResponse.json({ error: "Nome do template não fornecido." }, { status: 400 });
  }

  try {
    const file = bucket.file(`templates/${template}`);
    const [buffer] = await file.download();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=${template}`,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar template com Firebase Admin:", error);
    return NextResponse.json({ error: "Erro ao baixar template" }, { status: 500 });
  }
}
