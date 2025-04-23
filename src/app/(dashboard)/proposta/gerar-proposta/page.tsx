// ✅ Página: /gerar-proposta/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, listAll } from "firebase/storage";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import ResumoProjeto from "@/components/ResumoProjeto";

const storage = getStorage();

export default function GerarPropostaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  const precificacaoId = searchParams.get("precificacaoId");

  const [projeto, setProjeto] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>("");
  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [dadosPrecificacao, setDadosPrecificacao] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!clienteId || !projetoId || !precificacaoId) return;

      try {
        const projetoSnap = await getDoc(doc(db, "clientes", clienteId, "projetos", projetoId));
        if (projetoSnap.exists()) setProjeto(projetoSnap.data());

        const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
        if (clienteSnap.exists()) setCliente(clienteSnap.data());

        const precSnap = await getDoc(doc(
          db,
          "clientes",
          clienteId,
          "projetos",
          projetoId,
          "precificacao",
          precificacaoId,
          "dadosPrecificacao",
          precificacaoId
        ));
        if (precSnap.exists()) setDadosPrecificacao(precSnap.data());
      } catch (error) {
        console.error("Erro no carregamento dos dados:", error);
      }
    };

    fetchData();
  }, [clienteId, projetoId, precificacaoId]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const storageRef = ref(storage, "templates/propostas");
      const result = await listAll(storageRef);
      const nomes = result.items.map((item) => item.name);
      setTemplatesStorage(nomes);
    };
    fetchTemplates();
  }, []);

  const gerarFormaPagamento = (parcelaSelecionada: string, entrada?: number, financiamentoSelecionado?: any) => {
    if (parcelaSelecionada === "avista") return "Pagamento à vista";
    if (!financiamentoSelecionado) return "---";
    const { parcelas, valorParcela, totalPago, valorFinalProjeto } = financiamentoSelecionado;
    const format = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    let texto = "";
    if (entrada && entrada > 0) texto += `Entrada de ${format(entrada)} + `;
    texto += `${parcelas}x de ${format(valorParcela)} = ${format(totalPago)}\n`;
    texto += `Total do Projeto: ${format(valorFinalProjeto)}`;
    return texto;
  };

  const handleGerarProposta = async () => {
    if (!cliente || !projeto || !templateSelecionado || !dadosPrecificacao) {
      alert("Ainda carregando dados da precificação. Tente novamente em alguns segundos.");
      return;
    }

    setGerando(true);
    try {
      const qtdPlacasUsadas = projeto.modo === "manual" ? projeto.qtdPlacasManual ?? projeto.qtdPlacas : projeto.qtdPlacas ?? projeto.qtdPlacasManual;
      const campos = {
        nome_cliente: cliente.nomeCliente,
        cpf: cliente.cpf || "---",
        telefone: cliente.telefone || "---",
        cidade: cliente.cidade || "---",
        estado: cliente.estado || "---",
        criado_em: new Date().toLocaleDateString("pt-BR"),
        validade: "7 dias",
        geracao_media: projeto.modo === "manual" ? `${projeto.geracaoMensalManual ?? projeto.geracaoMensal ?? "---"} kWh/mês` : `${projeto.geracaoMensal ?? projeto.geracaoMensalManual ?? "---"} kWh/mês`,
        potencia_placas: `${projeto.potenciaPlaca} W`,
        potencia_instalada: `${projeto.potenciaPico} kWp`,
        estrutura: "Telhado colonial",
        quantidade_placas: qtdPlacasUsadas,
        qtd_painel_helius: qtdPlacasUsadas,
        qtd_microinversor: 2,
        area_necessaria: `${projeto.areaMinimaTotal} m²`,
        total_venda: dadosPrecificacao?.totalVenda ? `R$${dadosPrecificacao.totalVenda.toFixed(2)}` : "---",
        forma_pagamento: gerarFormaPagamento(
          dadosPrecificacao?.parcelaSelecionada,
          dadosPrecificacao?.entrada,
          dadosPrecificacao?.financiamentoSelecionado
        ),
        data_assinatura: `${new Date().toLocaleDateString("pt-BR")}`,
        nome_cliente_assinatura: cliente.nomeCliente,
        consumo_medio_mensal: projeto.modo === "manual"
          ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes ?? "---"
          : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual ?? "---",
        consumo_medio_diario: projeto.modo === "manual"
          ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia ?? "---"
          : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual ?? "---",
      };

      const response = await fetch("/api/download-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateSelecionado }),
      });

      if (!response.ok) throw new Error("Erro ao baixar template");

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "[[", end: "]]" },
      });

      doc.setData(campos);
      doc.render();

      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const limparNome = (texto: string) =>
        texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");

      const dataHoje = new Date().toISOString().split("T")[0];
      const nomeArquivo = `Proposta-Comercial-${limparNome(cliente.nomeCliente)}-${dataHoje}.docx`;
      saveAs(out, nomeArquivo);
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado ao gerar proposta.");
    } finally {
      setGerando(false);
    }
  };

  if (!cliente || !projeto) {
    return <div className="text-white p-10">Carregando proposta...</div>;
  }

  return (
    <section className="text-white px-6 py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Proposta Comercial 📄</h1>

      {/* ✅ Resumo reutilizável */}
      <ResumoProjeto
        cliente={cliente}
        projeto={projeto}
        dadosPrecificacao={dadosPrecificacao}
        variante="proposta"
      />

      {/* 📄 Seletor de template do Storage */}
      <div className="max-w-md mx-auto text-center">
        <label htmlFor="template" className="block font-semibold text-white mb-2 mt-8">
          Escolher Template (Storage)
        </label>
        <select
          id="template"
          className="select select-bordered w-full"
          value={templateSelecionado}
          onChange={(e) => setTemplateSelecionado(e.target.value)}
        >
          <option value="">Selecione um template</option>
          {templatesStorage.filter((t) => t.endsWith(".docx")).map((template) => (
            <option key={template} value={template}>
              {template.replace(".docx", "")}
            </option>
          ))}
        </select>
      </div>

      {/* 🎯 Botões */}
      <div className="flex justify-end items-center gap-6 mt-12">
        <button type="button" onClick={() => router.push("/proposta")} className="btn btn-outline w-40">
          Voltar
        </button>
        <button
          onClick={handleGerarProposta}
          type="button"
          className="btn w-40 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
          disabled={gerando || !templateSelecionado}
        >
          {gerando ? "Gerando..." : "Gerar Proposta"}
        </button>
      </div>

      <div ref={printRef} className="absolute top-0 left-0 opacity-0 -z-10 pointer-events-none"></div>
    </section>
  );
}
