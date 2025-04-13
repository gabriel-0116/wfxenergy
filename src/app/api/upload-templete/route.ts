// /app/api/upload-templete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (
      !file ||
      (!file.name.endsWith(".docx") &&
       !file.name.endsWith(".html") &&
       !file.name.endsWith(".pdf"))
    ) {
      return NextResponse.json(
        { error: "Arquivo inválido. Envie um .docx, .html ou .pdf" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const destination = `templates/${file.name}`;
    const fileRef = bucket.file(destination);

    await fileRef.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      public: true,
    });

    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    return NextResponse.json({
      message: "Upload realizado com sucesso!",
      nomeArquivo: file.name,
      url,
    });
  } catch (error: any) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do template" },
      { status: 500 }
    );
  }
}
