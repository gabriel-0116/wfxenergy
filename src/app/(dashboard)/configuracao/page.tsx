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

  // 📤 Envia arquivo pro Firebase Storage
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

      setMensagem({ texto: "Template enviado com sucesso!", tipo: "sucesso" });
      setArquivo(null);
      buscarTemplates(); // atualiza lista
    } catch (error) {
      console.error("❌ Erro ao enviar template:", error);
      setMensagem({ texto: "Erro ao enviar template", tipo: "erro" });
    } finally {
      setEnviando(false);
    }
  };

  // 🗑 Exclui template do Firebase Storage
  const excluirTemplate = async (nomeArquivo: string) => {
    const confirmar = confirm(`Tem certeza que deseja excluir o template "${nomeArquivo}"?`);
    if (!confirmar) return;

    try {
      const res = await fetch("/api/excluir-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeArquivo }),
      });

      if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.error || "Erro ao excluir template");
      }

      setMensagem({ texto: "Template excluído com sucesso!", tipo: "sucesso" });
      buscarTemplates(); // Atualiza lista
    } catch (error) {
      console.error("❌ Erro ao excluir template:", error);
      setMensagem({ texto: "Erro ao excluir template", tipo: "erro" });
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Título e mensagens de alerta */}
      <h1 className="text-3xl font-bold mb-4">⚙️ Configurações</h1>

      {mensagem && (
        <div className={`alert ${mensagem.tipo === "sucesso" ? "alert-success" : "alert-error"} shadow-lg mb-4`}>
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* Layout em duas colunas: esquerda (vazia por enquanto) e direita com o card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna esquerda: espaço reservado para configurações futuras */}
        <div className="col-span-2 space-y-4">
          <div className="bg-base-100 p-6 rounded-lg shadow-sm border border-base-300">
            <h2 className="text-lg font-semibold">🔧 Em breve: outras configurações</h2>
            <p className="text-gray-500 mt-2">
              Aqui você poderá editar preferências gerais do sistema, usuários, permissões e mais.
            </p>
          </div>
        </div>

        {/* Coluna direita: Card de templates */}
        <div className="space-y-4">
          <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-body space-y-4">
              <h2 className="card-title text-xl">📁 Templates</h2>

              {/* Input e botão para upload */}
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept=".docx,.html,.htm,.pdf"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  className="file-input file-input-bordered w-full"
                />
                <button
                  className="btn btn-primary w-full"
                  onClick={enviarTemplate}
                  disabled={!arquivo || enviando}
                >
                  {enviando ? "Enviando..." : "Enviar Template"}
                </button>
              </div>

              {/* Lista de arquivos */}
              <div>
                <h3 className="text-sm font-semibold mt-2">Templates enviados:</h3>
                {templates.length === 0 ? (
                  <p className="text-gray-400 mt-2 text-sm">Nenhum template enviado ainda.</p>
                ) : (
                  <ul className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                    {templates.map((nome) => (
                      <li
                        key={nome}
                        className="flex justify-between items-start bg-base-200 p-2 rounded-md text-sm"
                      >
                        <span className="break-all">{nome}</span>
                        <div className="flex gap-2">
                          <a
                            href={`https://firebasestorage.googleapis.com/v0/b/${bucketURL}/o/templates%2F${encodeURIComponent(
                              nome
                            )}?alt=media`}
                            className="btn btn-xs btn-outline btn-info"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Baixar
                          </a>
                          <button
                            onClick={() => excluirTemplate(nome)}
                            className="btn btn-xs btn-outline btn-error"
                          >
                            Excluir
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
