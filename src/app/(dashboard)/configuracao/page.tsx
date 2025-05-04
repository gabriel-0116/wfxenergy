// 📁 app/configuracoes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { variaveisProposta } from "@/utils/variaveisProposta";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

const bucketURL = "wfxenergy-5cb37.firebasestorage.app";

export default function Configuracoes() {
  const [arquivoProposta, setArquivoProposta] = useState<File | null>(null);
  const [arquivoContrato, setArquivoContrato] = useState<File | null>(null);
  const [templatesProposta, setTemplatesProposta] = useState<string[]>([]);
  const [templatesContrato, setTemplatesContrato] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState<{
    texto: string;
    tipo: "sucesso" | "erro";
  } | null>(null);
  const [enviandoProposta, setEnviandoProposta] = useState(false);
  const [enviandoContrato, setEnviandoContrato] = useState(false);

  const buscarTemplates = async (tipo: "proposta" | "contrato") => {
    try {
      const res = await fetch(`/api/listar-templates?tipo=${tipo}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao buscar arquivos.");
      if (tipo === "proposta") setTemplatesProposta(data.arquivos);
      if (tipo === "contrato") setTemplatesContrato(data.arquivos);
    } catch (error) {
      console.error("❌ Erro ao buscar templates:", error);
      setMensagem({ texto: "Erro ao buscar templates.", tipo: "erro" });
    }
  };

  useEffect(() => {
    buscarTemplates("proposta");
    buscarTemplates("contrato");
  }, []);

  const enviarTemplate = async (
    tipo: "proposta" | "contrato",
    arquivo: File | null
  ) => {
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
      tipo === "proposta"
        ? setEnviandoProposta(true)
        : setEnviandoContrato(true);
      const formData = new FormData();
      formData.append("file", arquivo);

      const res = await fetch(`/api/upload-template?tipo=${tipo}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro no upload do template");
      }

      setMensagem({
        texto: `Template de ${tipo} enviado com sucesso!`,
        tipo: "sucesso",
      });
      tipo === "proposta" ? setArquivoProposta(null) : setArquivoContrato(null);
      buscarTemplates(tipo);
    } catch (error) {
      console.error("❌ Erro ao enviar template:", error);
      setMensagem({
        texto: `Erro ao enviar template de ${tipo}`,
        tipo: "erro",
      });
    } finally {
      tipo === "proposta"
        ? setEnviandoProposta(false)
        : setEnviandoContrato(false);
    }
  };

  const excluirTemplate = async (
    tipo: "proposta" | "contrato",
    nomeArquivo: string
  ) => {
    const confirmar = confirm(
      `Tem certeza que deseja excluir o template "${nomeArquivo}"?`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(
        `/api/excluir-template?tipo=${tipo}&nomeArquivo=${encodeURIComponent(
          nomeArquivo
        )}`,
        {
          method: "DELETE", // <--- aqui é DELETE
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir template");
      }

      setMensagem({
        texto: `Template de ${tipo} excluído com sucesso!`,
        tipo: "sucesso",
      });
      buscarTemplates(tipo);
    } catch (error) {
      console.error("❌ Erro ao excluir template:", error);
      setMensagem({
        texto: `Erro ao excluir template de ${tipo}`,
        tipo: "erro",
      });
    }
  };

  const baixarTemplate = async (
    template: string,
    tipo: "proposta" | "contrato"
  ) => {
    const res = await fetch("/api/download-template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template, tipo }),
    });

    if (!res.ok) {
      const erro = await res.json();
      alert("Erro ao baixar template: " + erro.error);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = template;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      alert("Variável copiada para a área de transferência! 📋");
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <h1 className="text-3xl font-bold mb-10 text-center">⚙️ Configurações</h1>

      {mensagem && (
        <div
          className={`alert ${
            mensagem.tipo === "sucesso" ? "alert-success" : "alert-error"
          } shadow-lg mb-4`}
        >
          <span>{mensagem.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
          📄 Variáveis da Proposta e Contrato
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {variaveisProposta.map((variavel, index) => (
            <div
              key={index}
              className="relative border border-gray-700 rounded-xl p-5 bg-gray-800 shadow-md hover:shadow-lg transition"
            >
              {/* Botão copiar */}
              <button
                onClick={() => copiarTexto(variavel.nome)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
              >
                <FontAwesomeIcon icon={faCopy} size="sm" />
              </button>

              {/* Nome da variável */}
              <p className="font-mono text-md text-blue-400 break-words">
                {variavel.nome}
              </p>

              {/* Descrição da variável */}
              <p className="mt-2 text-sm text-gray-300">{variavel.descricao}</p>
            </div>
          ))}
        </div>
      </section>

        <div className="space-y-6">
          {["proposta", "contrato"].map((tipo) => {
            const typedTipo = tipo as "proposta" | "contrato";
            const isProposta = tipo === "proposta";
            const templates = isProposta
              ? templatesProposta
              : templatesContrato;
            const arquivo = isProposta ? arquivoProposta : arquivoContrato;
            const setArquivo = isProposta
              ? setArquivoProposta
              : setArquivoContrato;
            const enviando = isProposta ? enviandoProposta : enviandoContrato;

            return (
              <div
                key={tipo}
                className="card bg-base-100 shadow-2xl border border-base-300"
              >
                <div className="card-body space-y-4">
                  <h2 className="card-title text-xl">
                    {isProposta
                      ? "📁 Templates de Proposta"
                      : "📄 Templates de Contrato"}
                  </h2>

                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      accept=".docx,.html,.htm,.pdf"
                      onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                      className="file-input file-input-bordered w-full"
                    />
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => enviarTemplate(typedTipo, arquivo)}
                      disabled={!arquivo || enviando}
                    >
                      {enviando ? "Enviando..." : `Enviar Template de ${tipo}`}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mt-2">
                      Templates enviados:
                    </h3>
                    {templates.length === 0 ? (
                      <p className="text-gray-400 mt-2 text-sm">
                        Nenhum template enviado ainda.
                      </p>
                    ) : (
                      <ul className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                        {templates.map((nome) => (
                          <li
                            key={nome}
                            className="flex justify-between items-start bg-base-200 p-2 rounded-md text-sm"
                          >
                            <span className="break-all">{nome}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => baixarTemplate(nome, typedTipo)}
                                className="btn btn-xs btn-outline btn-info"
                              >
                                Baixar
                              </button>

                              <button
                                onClick={() => excluirTemplate(typedTipo, nome)}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
