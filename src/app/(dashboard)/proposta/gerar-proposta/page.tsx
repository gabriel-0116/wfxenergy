// ✅ Página: /proposta/gerar-proposta/page.tsx
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

  // 🔹 compat: precificacaoId na URL hoje é o orcamentoId
  const precificacaoId = searchParams.get("precificacaoId");
  const orcamentoIdFromQuery = searchParams.get("orcamentoId");
  const orcamentoId = orcamentoIdFromQuery ?? precificacaoId;

  const [projeto, setProjeto] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>("");
  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);

  // 🔹 agora é ORÇAMENTO, não mais "dadosPrecificacao"
  const [dadosOrcamento, setDadosOrcamento] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!clienteId || !projetoId || !orcamentoId) return;

      try {
        // projeto (já contém estrutura/inversor agora)
        const projetoSnap = await getDoc(
          doc(db, "clientes", clienteId, "projetos", projetoId)
        );
        if (projetoSnap.exists()) setProjeto(projetoSnap.data());

        // cliente
        const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
        if (clienteSnap.exists()) setCliente(clienteSnap.data());

        // orçamento salvo na tela de dados-orcamento
        const orcSnap = await getDoc(
          doc(
            db,
            "clientes",
            clienteId,
            "projetos",
            projetoId,
            "orcamentos",
            orcamentoId
          )
        );
        if (orcSnap.exists()) {
          setDadosOrcamento(orcSnap.data());
        } else {
          setErros((prev) => [
            ...prev,
            "Nenhum orçamento encontrado para este projeto.",
          ]);
        }
      } catch (error) {
        console.error("Erro no carregamento dos dados:", error);
        setErros((prev) => [
          ...prev,
          "Erro ao carregar dados do cliente/projeto/orçamento.",
        ]);
      }
    };

    fetchData();
  }, [clienteId, projetoId, orcamentoId]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const storageRef = ref(storage, "templates/propostas");
      const result = await listAll(storageRef);
      const nomes = result.items.map((item) => item.name);
      setTemplatesStorage(nomes);
    };
    fetchTemplates();
  }, []);

  function gerarFormaPagamento(dados: any): string {
    if (!dados) return "---";

    const entrada = Number(dados.entrada || 0);
    const parcelas = dados.parcelaSelecionada;
    const fin = dados.financiamentoSelecionado;

    const format = (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // Se não tem financiamento salvo, tenta cair pra totalVenda
    if (!fin) {
      if (parcelas === "avista" && typeof dados.totalVenda === "number") {
        return `À vista: ${format(dados.totalVenda)}`;
      }
      return "---";
    }

    const valorParcela = Number(fin.valorParcela || 0);
    const totalPago = Number(fin.totalPago || fin.valorFinalProjeto || 0);
    const valorFinalProjeto = Number(fin.valorFinalProjeto || totalPago || 0);

    if (parcelas === "avista") {
      // À vista: usa valor final do projeto
      return `À vista: ${format(valorFinalProjeto)}`;
    }

    if (entrada > 0) {
      return `Entrada de ${format(entrada)} + ${parcelas}x de ${format(
        valorParcela
      )} (Total: ${format(valorFinalProjeto)})`;
    }

    return `${parcelas}x de ${format(valorParcela)} (Total: ${format(
      valorFinalProjeto
    )})`;
  }

  const handleGerarProposta = async () => {
    const errosValidacao = validarCamposProposta({
      cliente,
      projeto,
      dadosOrcamento,
    });

    if (errosValidacao.length > 0) {
      setErros(errosValidacao);
      return;
    }

    if (!cliente || !projeto || !templateSelecionado || !dadosOrcamento) {
      alert(
        "Ainda carregando dados do orçamento. Tente novamente em alguns segundos."
      );
      return;
    }

    setGerando(true);
    try {
      const enderecoPrincipal = cliente.enderecos?.[0] || {};

      const nomeClienteCampo =
        cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;

      const cpfOuCnpjCampo =
        cliente.tipoPessoa === "pj" ? cliente.cnpj : cliente.cpf;

      const nomeClienteAssinaturaCampo =
        cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;

      const qtdPlacasUsadas =
        projeto.modo === "manual"
          ? projeto.qtdPlacasManual || projeto.qtdPlacas || "---"
          : projeto.qtdPlacas || projeto.qtdPlacasManual || "---";

      const potenciaInstalada =
        projeto.modo === "manual"
          ? projeto.potenciaPicoManual ?? projeto.potenciaPico
          : projeto.potenciaPico ?? projeto.potenciaPicoManual;

      const financiamento = dadosOrcamento?.financiamentoSelecionado;
      const valorFinalProjeto = Number(
        financiamento?.valorFinalProjeto ?? financiamento?.totalPago ?? 0
      );

      // ✅ NOVO: nome do kit para template (use no DOCX como [[nome_kit]])
      const nomeKitCampo =
        dadosOrcamento?.kitSelecionado?.nomeProduto ||
        dadosOrcamento?.kitSelecionado?.nome ||
        "---";

      const campos = {
        // 🧍 Cliente
        nome_cliente: nomeClienteCampo || "---",
        cpf: cpfOuCnpjCampo || "---", // não é usado no template atual, mas não atrapalha
        telefone: cliente.telefone || "---",

        // 📍 Endereço
        cidade: enderecoPrincipal.cidade || "---",
        estado: enderecoPrincipal.estado || "---",
        logradouro: enderecoPrincipal.endereco || "---",
        numero: enderecoPrincipal.numero || "---",
        cep: enderecoPrincipal.cep || "---",

        // 📅 Datas
        criado_em: new Date().toLocaleDateString("pt-BR"),
        validade: "7 dias",
        data_assinatura: new Date().toLocaleDateString("pt-BR"),
        nome_cliente_assinatura: nomeClienteAssinaturaCampo || "---",

        // ✅ NOVO
        nome_kit: nomeKitCampo,

        // 📊 Consumo / geração
        consumo_medio_mensal:
          projeto.modo === "manual"
            ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes ?? "---"
            : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual ?? "---",

        consumo_medio_diario:
          projeto.modo === "manual"
            ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia ?? "---"
            : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual ?? "---",

        geracao_media:
          projeto.modo === "manual"
            ? `${projeto.geracaoMensalManual ?? projeto.geracaoMensal ?? "---"} kWh/mês`
            : `${projeto.geracaoMensal ?? projeto.geracaoMensalManual ?? "---"} kWh/mês`,

        // 🔧 Projeto
        nome_projeto: projeto?.nomeProjeto || "---",
        quantidade_placas:
          projeto.modo === "manual"
            ? projeto.qtdPlacasManual || projeto.qtdPlacas || "---"
            : projeto.qtdPlacas || projeto.qtdPlacasManual || "---",

        qtd_painel_helius:
          projeto.modo === "manual"
            ? projeto.qtdPlacasManual || projeto.qtdPlacas || "---"
            : projeto.qtdPlacas || projeto.qtdPlacasManual || "---",

        potencia_placas: `${projeto.potenciaPlaca} W`,
        potencia_instalada: `${
          projeto.modo === "manual"
            ? projeto.potenciaPicoManual ?? projeto.potenciaPico
            : projeto.potenciaPico ?? projeto.potenciaPicoManual
        } kWp`,

        area_necessaria: `${projeto.areaMinimaTotal} m²`,

        // 🧱 Estrutura + inversor → AGORA VINDO DO PROJETO
        estrutura: projeto.estruturaProjeto || "---",

        // 💰 Financeiro — usa valor FINAL do orçamento
        valor_a_vista: valorFinalProjeto
          ? `R$ ${valorFinalProjeto.toFixed(2)}`
          : "---",
        forma_pagamento: gerarFormaPagamento(dadosOrcamento),
      };

      const response = await fetch("/api/gerar-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: `propostas/${templateSelecionado}`,
          campos,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Erro ao baixar template");
      }

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
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const limparNome = (texto: string) =>
        texto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_-]/g, "");

      const dataHoje = new Date().toISOString().split("T")[0];

      const nomeArquivo = `Proposta-Comercial-${limparNome(
        cliente.nomeCliente
      )}-${limparNome(projeto.nomeProjeto)}-${dataHoje}.docx`;

      saveAs(out, nomeArquivo);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setErros(["Erro inesperado ao gerar proposta."]);
    } finally {
      setGerando(false);
    }
  };

  function validarCamposProposta({
    cliente,
    projeto,
    dadosOrcamento,
  }: {
    cliente: any;
    projeto: any;
    dadosOrcamento: any;
  }): string[] {
    const erros: string[] = [];

    const isVazio = (valor: any) =>
      valor === undefined || valor === null || valor === "";

    // CLIENTE
    const nomeCliente =
      cliente?.tipoPessoa === "pj"
        ? cliente?.razaoSocial
        : cliente?.nomeCliente;

    if (isVazio(nomeCliente)) erros.push("Nome do cliente não informado.");
    if (isVazio(cliente?.telefone))
      erros.push("Telefone do cliente não informado.");

    // ✅ NOVO: KIT (nome do kit)
    const nomeKit =
      dadosOrcamento?.kitSelecionado?.nomeProduto ||
      dadosOrcamento?.kitSelecionado?.nome;

    if (isVazio(nomeKit)) erros.push("Kit não selecionado no orçamento.");

    // PROJETO
    if (isVazio(projeto?.nomeProjeto))
      erros.push("Nome do projeto não informado.");

    if (isVazio(projeto?.potenciaPlaca))
      erros.push("Potência da placa não informada.");

    if (isVazio(projeto?.areaMinimaTotal))
      erros.push("Área necessária não informada.");

    const qtdPlacas =
      projeto?.modo === "manual"
        ? projeto?.qtdPlacasManual
        : projeto?.qtdPlacas;

    const geracaoMensal =
      projeto?.modo === "manual"
        ? projeto?.geracaoMensalManual
        : projeto?.geracaoMensal;

    const consumoMensal =
      projeto?.modo === "manual"
        ? projeto?.consumoMedioMesManual ?? projeto?.consumoMedioMes
        : projeto?.consumoMedioMes ?? projeto?.consumoMedioMesManual;

    const consumoDiario =
      projeto?.modo === "manual"
        ? projeto?.consumoMedioDiaManual ?? projeto?.consumoMedioDia
        : projeto?.consumoMedioDia ?? projeto?.consumoMedioDiaManual;

    const potenciaInstalada =
      projeto?.modo === "manual"
        ? projeto?.potenciaPicoManual ?? projeto?.potenciaPico
        : projeto?.potenciaPico ?? projeto?.potenciaPicoManual;

    if (isVazio(potenciaInstalada))
      erros.push("Potência instalada não informada.");

    if (isVazio(qtdPlacas))
      erros.push("Quantidade de placas não informada.");

    if (isVazio(geracaoMensal))
      erros.push("Geração mensal não informada.");

    if (isVazio(consumoMensal))
      erros.push("Consumo médio mensal não informado.");

    if (isVazio(consumoDiario))
      erros.push("Consumo médio diário não informado.");

    // PROJETO – inversor/estrutura (agora vêm do projeto)
    if (isVazio(projeto?.estruturaProjeto))
      erros.push("Estrutura do projeto não informada.");

    const valorFinalProjeto =
      dadosOrcamento?.financiamentoSelecionado?.valorFinalProjeto;

    if (!valorFinalProjeto || valorFinalProjeto <= 0) {
      erros.push("Valor final do projeto não informado.");
    }

    if (
      dadosOrcamento?.parcelaSelecionada !== "avista" &&
      !dadosOrcamento?.financiamentoSelecionado
    ) {
      erros.push("Informações de financiamento não informadas.");
    }

    return erros;
  }

  useEffect(() => {
    if (erros.length > 0) {
      const timer = setTimeout(() => setErros([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [erros]);

  if (!cliente || !projeto) {
    return <div className="text-white p-10">Carregando proposta...</div>;
  }

  return (
    <section className="text-white px-6 py-6 space-y-8">
      {erros.length > 0 && (
        <div className="toast toast-top toast-end z-50">
          {erros.map((erro, i) => (
            <div key={i} className="alert alert-error">
              <span>{erro}</span>
            </div>
          ))}
        </div>
      )}

      <h1 className="text-3xl font-bold text-center">Proposta Comercial 📄</h1>

      {/* compat: ainda chamando dadosPrecificacao, mas o conteúdo é o ORÇAMENTO */}
      <ResumoProjeto
        cliente={cliente}
        projeto={projeto}
        dadosOrcamento={dadosOrcamento}
        variante="proposta"
      />

      {/* Seletor de template */}
      <div className="max-w-md mx-auto text-center">
        <label
          htmlFor="template"
          className="block font-semibold text-white mb-2 mt-8"
        >
          Escolher Template (Storage)
        </label>
        <select
          id="template"
          className="select select-bordered w-full"
          value={templateSelecionado}
          onChange={(e) => setTemplateSelecionado(e.target.value)}
        >
          <option value="">Selecione um template</option>
          {templatesStorage
            .filter((t) => t.endsWith(".docx"))
            .map((template) => (
              <option key={template} value={template}>
                {template.replace(".docx", "")}
              </option>
            ))}
        </select>
      </div>

      <div className="flex justify-end items-center gap-6 mt-12">
        <button
          type="button"
          onClick={() => router.push("/proposta")}
          className="btn btn-outline w-40"
        >
          Voltar
        </button>
        <button
          onClick={handleGerarProposta}
          type="button"
          className="btn w-40 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
          disabled={gerando || !templateSelecionado || erros.length > 0}
        >
          {gerando ? "Gerando..." : "Gerar Proposta"}
        </button>
      </div>

      <div
        ref={printRef}
        className="absolute top-0 left-0 opacity-0 -z-10 pointer-events-none"
      ></div>
    </section>
  );
}
