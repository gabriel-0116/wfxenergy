// 📁 app/configuracoes/page.tsx
"use client";

import { useEffect, useState } from "react";

// 🔒 Nome do bucket fixado para evitar erro com process.env no client
const bucketURL = "wfxenergy-5cb37.firebasestorage.app";

export default function Configuracoes() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: "sucesso" | "erro" } | null>(null);
  const [enviando, setEnviando] = useState(false);

  // 🔁 Busca templates via API server-side (sem CORS)
  const buscarTemplates = async () => {
    try {
      const res = await fetch("/api/listar-templates");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao buscar arquivos.");
      setTemplates(data.arquivos);
    } catch (error) {
      console.error("❌ Erro ao buscar templates:", error);
      setMensagem({ texto: "Erro ao buscar templates.", tipo: "erro" });
    }
  };

  useEffect(() => {
    buscarTemplates();
  }, []);

  // 📤 Envia o template para o Firebase Storage via rota API
  const enviarTemplate = async () => {
    if (
      !arquivo ||
      (!arquivo.name.endsWith(".docx") &&
        !arquivo.name.endsWith(".html") &&
        !arquivo.name.endsWith(".htm") &&
        !arquivo.name.endsWith(".pdf"))
    ) {
      setMensagem({
        texto: "Envie apenas arquivos .docx, .html ou .pdf",
        tipo: "erro",
      });
      return;
    }

    try {
      setEnviando(true);

      const formData = new FormData();
      formData.append("file", arquivo);

      const res = await fetch("/api/upload-template", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro no upload do template");
      }

      setMensagem({
        texto: "Template enviado com sucesso!",
        tipo: "sucesso",
      });

      setArquivo(null);
      buscarTemplates(); // Atualiza lista após upload
    } catch (error) {
      console.error("❌ Erro ao enviar template:", error);
      setMensagem({ texto: "Erro ao enviar template", tipo: "erro" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gerenciar Templates (.docx, .html, .pdf)</h1>

      {mensagem && (
        <div className={`alert ${mensagem.tipo === "sucesso" ? "alert-success" : "alert-error"} shadow-lg`}>
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* 📁 Upload */}
      <div className="flex gap-4 items-center">
        <input
          type="file"
          accept=".docx,.html,.htm,.pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] || null)}
          className="file-input file-input-bordered w-full max-w-xs"
        />
        <button
          className="btn btn-primary"
          onClick={enviarTemplate}
          disabled={!arquivo || enviando}
        >
          {enviando ? "Enviando..." : "Enviar Template"}
        </button>
      </div>

      {/* 📂 Lista */}
      <div>
        <h3 className="text-lg font-semibold mt-6">Templates Enviados</h3>
        {templates.length === 0 ? (
          <p className="text-gray-400 mt-2">Nenhum template enviado ainda.</p>
        ) : (
          <ul className="space-y-2 mt-4">
            {templates.map((nome) => (
              <li
                key={nome}
                className="flex justify-between items-center bg-base-200 p-3 rounded-md"
              >
                <span>{nome}</span>
                <a
                  href={`https://firebasestorage.googleapis.com/v0/b/${bucketURL}/o/templates%2F${encodeURIComponent(
                    nome
                  )}?alt=media`}
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Baixar
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4">
          Deseja usar esse template?{" "}
          <a href="/proposta" className="text-blue-600 underline">
            Ir para proposta
          </a>
        </p>
      </div>
    </div>
  );
}
