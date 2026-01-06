"use client";

import { useCallback, useEffect, useState } from "react";
import { variaveisProposta } from "@/utils/variaveisProposta";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboard,
  faCopy,
  faFileContract,
  faFileInvoice,
  faGear,
  faList,
  faMapMarkerAlt,
  faSolarPanel,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

type Mensagem = {
  texto: string;
  tipo: "sucesso" | "erro";
};

type TipoTemplate = "proposta" | "contrato";
type AbaAtiva = "variaveis" | "proposta" | "contrato";

export default function Configuracoes() {
  const [arquivoProposta, setArquivoProposta] = useState<File | null>(null);
  const [arquivoContrato, setArquivoContrato] = useState<File | null>(null);
  const [templatesProposta, setTemplatesProposta] = useState<string[]>([]);
  const [templatesContrato, setTemplatesContrato] = useState<string[]>([]);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("variaveis");
  const [enviandoProposta, setEnviandoProposta] = useState(false);
  const [enviandoContrato, setEnviandoContrato] = useState(false);

  const buscarTemplates = useCallback(async (tipo: TipoTemplate) => {
    try {
      const res = await fetch(`/api/listar-templates?tipo=${tipo}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao buscar arquivos.");

      if (tipo === "proposta") setTemplatesProposta(data.arquivos ?? []);
      if (tipo === "contrato") setTemplatesContrato(data.arquivos ?? []);
    } catch (error) {
      console.error("❌ Erro ao buscar templates:", error);
      setMensagem({ texto: "Erro ao buscar templates.", tipo: "erro" });
    }
  }, []);

  useEffect(() => {
    buscarTemplates("proposta");
    buscarTemplates("contrato");
  }, [buscarTemplates]);

  const enviarTemplate = async (tipo: TipoTemplate, arquivo: File | null) => {
    const extValida =
      arquivo &&
      (arquivo.name.endsWith(".docx") ||
        arquivo.name.endsWith(".html") ||
        arquivo.name.endsWith(".htm") ||
        arquivo.name.endsWith(".pdf"));

    if (!extValida) {
      setMensagem({
        texto: "Envie apenas arquivos .docx, .html, .htm ou .pdf",
        tipo: "erro",
      });
      return;
    }

    try {
      // ✅ nada de ternário pra side-effect
      if (tipo === "proposta") setEnviandoProposta(true);
      else setEnviandoContrato(true);

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

      if (tipo === "proposta") setArquivoProposta(null);
      else setArquivoContrato(null);

      await buscarTemplates(tipo);
    } catch (error) {
      console.error("❌ Erro ao enviar template:", error);
      setMensagem({
        texto: `Erro ao enviar template de ${tipo}`,
        tipo: "erro",
      });
    } finally {
      if (tipo === "proposta") setEnviandoProposta(false);
      else setEnviandoContrato(false);
    }
  };

  const excluirTemplate = async (tipo: TipoTemplate, nomeArquivo: string) => {
    const confirmar = confirm(
      `Tem certeza que deseja excluir o template "${nomeArquivo}"?`
    );
    if (!confirmar) return;

    try {
      const res = await fetch(
        `/api/excluir-template?tipo=${tipo}&nomeArquivo=${encodeURIComponent(
          nomeArquivo
        )}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir template");

      setMensagem({
        texto: `Template de ${tipo} excluído com sucesso!`,
        tipo: "sucesso",
      });

      await buscarTemplates(tipo);
    } catch (error) {
      console.error("❌ Erro ao excluir template:", error);
      setMensagem({
        texto: `Erro ao excluir template de ${tipo}`,
        tipo: "erro",
      });
    }
  };

  const baixarTemplate = async (template: string, tipo: TipoTemplate) => {
    const res = await fetch("/api/download-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      <h1 className="text-3xl font-bold mb-10 text-center">
        <FontAwesomeIcon icon={faGear} /> Configurações
      </h1>

      {mensagem && (
        <div
          className={`alert ${
            mensagem.tipo === "sucesso" ? "alert-success" : "alert-error"
          } shadow-lg mb-4`}
        >
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* Abas */}
      <div className="tabs justify-center mb-8">
        <button
          className={`tab tab-lg tab-bordered text-white ${
            abaAtiva === "variaveis" ? "tab-active" : ""
          }`}
          onClick={() => setAbaAtiva("variaveis")}
        >
          <FontAwesomeIcon icon={faList} className="mr-2" /> Variáveis
        </button>

        <button
          className={`tab tab-lg tab-bordered text-white ${
            abaAtiva === "proposta" ? "tab-active" : ""
          }`}
          onClick={() => setAbaAtiva("proposta")}
        >
          <FontAwesomeIcon icon={faFileInvoice} className="mr-2" /> Templates de
          Proposta
        </button>

        <button
          className={`tab tab-lg tab-bordered text-white ${
            abaAtiva === "contrato" ? "tab-active" : ""
          }`}
          onClick={() => setAbaAtiva("contrato")}
        >
          <FontAwesomeIcon icon={faFileContract} className="mr-2" /> Templates de
          Contrato
        </button>
      </div>

      {abaAtiva === "variaveis" && (
        <section className="space-y-6 mb-10">
          <h2 className="text-3xl font-bold mb-6 gap-2 text-center">
            <FontAwesomeIcon icon={faClipboard} /> Variáveis da Proposta e
            Contrato
          </h2>

          {/* Linha 1: Cliente + Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Cliente */}
            <div className="bg-base-100 shadow-2xl border border-base-300 transition-transform hover:scale-[1.02] p-5 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-zinc-400" />{" "}
                Dados do Cliente
              </h3>
              <div className="space-y-4">
                {variaveisProposta
                  .filter((v) => v.categoria === "cliente")
                  .map((variavel, index) => (
                    <div
                      key={index}
                      className="relative bg-gray-900 p-3 rounded-lg hover:shadow-md"
                    >
                      <button
                        onClick={() => copiarTexto(variavel.nome)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      >
                        <FontAwesomeIcon icon={faCopy} size="sm" />
                      </button>
                      <p className="font-mono text-blue-400">{variavel.nome}</p>
                      <p className="text-gray-300 text-sm">
                        {variavel.descricao}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Card: Endereço */}
            <div className="bg-base-100 shadow-2xl border border-base-300 transition-transform hover:scale-[1.02] p-5 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  className="text-red-600"
                />{" "}
                Endereço
              </h3>
              <div className="space-y-4">
                {variaveisProposta
                  .filter((v) => v.categoria === "endereco")
                  .map((variavel, index) => (
                    <div
                      key={index}
                      className="relative bg-gray-900 p-3 rounded-lg hover:shadow-md"
                    >
                      <button
                        onClick={() => copiarTexto(variavel.nome)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                      >
                        <FontAwesomeIcon icon={faCopy} size="sm" />
                      </button>
                      <p className="font-mono text-blue-400">{variavel.nome}</p>
                      <p className="text-gray-300 text-sm">
                        {variavel.descricao}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Linha 2: Projeto */}
          <div className="bg-base-100 shadow-2xl border border-base-300 transition-transform hover:scale-[1.02] p-5 rounded-xl">
            <h3 className="text-xl font-semibold text-white mb-4 items-center text-center gap-2">
              <FontAwesomeIcon icon={faSolarPanel} className="text-orange-400" />{" "}
              Dados do Projeto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {variaveisProposta
                .filter((v) => v.categoria === "projeto")
                .map((variavel, index) => (
                  <div
                    key={index}
                    className="relative bg-gray-900 p-3 rounded-lg hover:shadow-md"
                  >
                    <button
                      onClick={() => copiarTexto(variavel.nome)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    >
                      <FontAwesomeIcon icon={faCopy} size="sm" />
                    </button>
                    <p className="font-mono text-blue-400">{variavel.nome}</p>
                    <p className="text-gray-300 text-sm">
                      {variavel.descricao}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {abaAtiva !== "variaveis" && (
        <div className="space-y-6">
          {(() => {
            const tipo = abaAtiva as TipoTemplate;
            const isProposta = tipo === "proposta";

            const templates = isProposta ? templatesProposta : templatesContrato;
            const arquivo = isProposta ? arquivoProposta : arquivoContrato;
            const setArquivo = isProposta
              ? setArquivoProposta
              : setArquivoContrato;

            const enviando = isProposta ? enviandoProposta : enviandoContrato;

            return (
              <div className="card bg-base-100 shadow-2xl border border-base-300">
                <div className="card-body space-y-4">
                  <h2 className="card-title text-xl">
                    {isProposta
                      ? "📁 Templates de Proposta"
                      : "📄 Templates de Contrato"}
                  </h2>

                  <input
                    type="file"
                    accept=".docx,.html,.htm,.pdf"
                    onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                    className="file-input file-input-bordered w-full"
                  />

                  <button
                    className="btn btn-primary w-full"
                    onClick={() => enviarTemplate(tipo, arquivo)}
                    disabled={!arquivo || enviando}
                  >
                    {enviando ? "Enviando..." : `Enviar Template de ${tipo}`}
                  </button>

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
                              onClick={() => baixarTemplate(nome, tipo)}
                              className="btn btn-xs btn-outline btn-info"
                            >
                              Baixar
                            </button>
                            <button
                              onClick={() => excluirTemplate(tipo, nome)}
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
