// ✅ /app/api/gerar-pdf-from-html/route.ts
import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/firebase/firebaseAdmin";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function POST(req: NextRequest) {
  try {
    const { template, campos } = await req.json();

    if (!template || !template.endsWith(".html") || !campos) {
      return NextResponse.json({ error: "Template HTML ou campos inválidos" }, { status: 400 });
    }

    // 🔽 Baixa o template HTML do Firebase Storage
    const fileRef = bucket.file(`templates/${template}`);
    const [fileBuffer] = await fileRef.download();
    let htmlContent = fileBuffer.toString("utf-8");

    // 🔁 Substitui os placeholders {{chave}} por valores reais
    Object.entries(campos).forEach(([chave, valor]) => {
      const regex = new RegExp(`{{${chave}}}`, "g");
      htmlContent = htmlContent.replace(regex, String(valor));
    });

    // 🧠 Inicia o Chromium compatível com Vercel
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Proposta.pdf`,
      },
    });
  } catch (error) {
    console.error("❌ ERRO AO GERAR PDF:", error);
    return NextResponse.json(
      { error: "Erro ao gerar PDF", detalhe: String(error) },
      { status: 500 }
    );
  }
}
