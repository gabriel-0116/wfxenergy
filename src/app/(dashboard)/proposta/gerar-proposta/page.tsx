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
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!clienteId || !projetoId || !precificacaoId) return;

      try {
        const projetoSnap = await getDoc(
          doc(db, "clientes", clienteId, "projetos", projetoId)
        );
        if (projetoSnap.exists()) setProjeto(projetoSnap.data());

        const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
        if (clienteSnap.exists()) setCliente(clienteSnap.data());

        const precSnap = await getDoc(
          doc(
            db,
            `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao/${precificacaoId}`
          )
        );
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

  function gerarFormaPagamento(dadosPrecificacao: any): string {
    const entrada = parseFloat(dadosPrecificacao?.entrada || "0");
    const parcelas = dadosPrecificacao?.parcelaSelecionada;
    const valorParcela =
      dadosPrecificacao?.financiamentoSelecionado?.valorParcela;
    const totalVenda = dadosPrecificacao?.totalVenda;

    if (parcelas === "avista") {
      if (entrada > 0) {
        return `Entrada: R$ ${entrada.toFixed(
          2
        )} | Valor à vista: R$ ${totalVenda.toFixed(2)}`;
      } else {
        return `R$ ${totalVenda.toFixed(2)}`;
      }
    }

    if (typeof parcelas === "number" && valorParcela) {
      if (entrada > 0) {
        return `Entrada: R$ ${entrada.toFixed(
          2
        )} | ${parcelas}x de R$ ${valorParcela.toFixed(2)}`;
      } else {
        return `${parcelas}x de R$ ${valorParcela.toFixed(2)}`;
      }
    }

    return "---";
  }

  const handleGerarProposta = async () => {
    const errosValidacao = validarCamposProposta({
      cliente,
      projeto,
      dadosPrecificacao,
    });

    if (errosValidacao.length > 0) {
      setErros(errosValidacao);
      return;
    }

    if (!cliente || !projeto || !templateSelecionado || !dadosPrecificacao) {
      alert(
        "Ainda carregando dados da precificação. Tente novamente em alguns segundos."
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

      const campos = {
        nome_cliente: nomeClienteCampo || "---",
        cpf: cpfOuCnpjCampo || "---",
        telefone: cliente.telefone || "---",
        cidade: enderecoPrincipal.cidade || "---",
        estado: enderecoPrincipal.estado || "---",
        logradouro: enderecoPrincipal.endereco || "---",
        numero: enderecoPrincipal.numero || "---",
        cep: enderecoPrincipal.cep || "---",
        criado_em: new Date().toLocaleDateString("pt-BR"),
        validade: "7 dias",
        geracao_media:
          projeto.modo === "manual"
            ? `${
                projeto.geracaoMensalManual ?? projeto.geracaoMensal ?? "---"
              } kWh/mês`
            : `${
                projeto.geracaoMensal ?? projeto.geracaoMensalManual ?? "---"
              } kWh/mês`,
        potencia_placas: `${projeto.potenciaPlaca} W`,
        potencia_instalada: `${potenciaInstalada} kWp`,
        estrutura: dadosPrecificacao?.estruturaProjeto || "---",
        quantidade_placas: qtdPlacasUsadas,
        qtd_painel_helius: qtdPlacasUsadas,
        inversor_microinversor: dadosPrecificacao.tipoInversor ?? "---",
        nome_projeto: projeto?.nomeProjeto || "---",
        qtd_inversor_microinversor:
          dadosPrecificacao.quantidadeInversor ?? "---",
        area_necessaria: `${projeto.areaMinimaTotal} m²`,
        potencia_inversor_microinversor:
          dadosPrecificacao?.potenciaInversorDigitada
            ? `${dadosPrecificacao.potenciaInversorDigitada} kWp`
            : "---",
        valor_a_vista: dadosPrecificacao?.totalVenda
          ? `R$ ${dadosPrecificacao.totalVenda.toFixed(2)}`
          : "---",

        total_financiado: (() => {
          if (!dadosPrecificacao?.financiamentoSelecionado) return "---";

          const entrada = parseFloat(dadosPrecificacao.entrada || "0");
          const totalPago =
            dadosPrecificacao.financiamentoSelecionado.totalPago || 0;

          const total = entrada + totalPago;

          return `R$ ${total.toFixed(2)}`;
        })(),
        forma_pagamento: gerarFormaPagamento(dadosPrecificacao),
        data_assinatura: `${new Date().toLocaleDateString("pt-BR")}`,
        nome_cliente_assinatura: nomeClienteAssinaturaCampo || "---",
        consumo_medio_mensal:
          projeto.modo === "manual"
            ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes ?? "---"
            : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual ?? "---",
        consumo_medio_diario:
          projeto.modo === "manual"
            ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia ?? "---"
            : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual ?? "---",
      };

      const response = await fetch("/api/gerar-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: `propostas/${templateSelecionado}`,
          campos, // já montado antes
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
          .normalize("NFD") // Remove acentos
          .replace(/[\u0300-\u036f]/g, "") // Remove caracteres especiais de acento
          .replace(/\s+/g, "_") // Troca espaços por underline
          .replace(/[^a-zA-Z0-9_-]/g, ""); // Remove qualquer outro caractere não permitido

      const dataHoje = new Date().toISOString().split("T")[0];

      // Adiciona o nome do projeto no nome do arquivo
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

  // ✅ Função de validação antes de gerar proposta
  // ✅ Função de validação antes de gerar proposta
function validarCamposProposta({
  cliente,
  projeto,
  dadosPrecificacao,
}: {
  cliente: any;
  projeto: any;
  dadosPrecificacao: any;
}): string[] {
  const erros: string[] = [];

  // 🧪 Função auxiliar para verificar se um valor é vazio
  const isVazio = (valor: any) =>
    valor === undefined || valor === null || valor === "";

  // ✅ CLIENTE
  const nomeCliente =
    cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;

  if (isVazio(nomeCliente)) erros.push("Nome do cliente não informado.");
  if (isVazio(cliente.telefone))
    erros.push("Telefone do cliente não informado.");

  // ✅ PROJETO
  if (isVazio(projeto.nomeProjeto))
    erros.push("Nome do projeto não informado.");

  if (isVazio(projeto.potenciaPlaca))
    erros.push("Potência da placa não informada.");

  if (isVazio(projeto.areaMinimaTotal))
    erros.push("Área necessária não informada.");

  // 🧠 Usa valores manuais se estiver em modo manual, senão usa os normais
  const qtdPlacas =
    projeto.modo === "manual"
      ? projeto.qtdPlacasManual
      : projeto.qtdPlacas;

  const geracaoMensal =
    projeto.modo === "manual"
      ? projeto.geracaoMensalManual
      : projeto.geracaoMensal;

  const consumoMensal =
    projeto.modo === "manual"
      ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes
      : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual;

  const consumoDiario =
    projeto.modo === "manual"
      ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia
      : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual;

  const potenciaInstalada =
    projeto.modo === "manual"
      ? projeto.potenciaPicoManual ?? projeto.potenciaPico
      : projeto.potenciaPico ?? projeto.potenciaPicoManual;

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

  // ✅ PRECIFICAÇÃO
  if (isVazio(dadosPrecificacao?.estruturaProjeto))
    erros.push("Estrutura do projeto não informada.");

  if (!dadosPrecificacao?.quantidadeInversor)
    erros.push("Quantidade de inversores não informada.");

  if (isVazio(dadosPrecificacao?.tipoInversor))
    erros.push("Tipo de inversor não informado.");

  if (!dadosPrecificacao?.potenciaInversorDigitada)
    erros.push("Potência do inversor não informada.");

  if (!dadosPrecificacao?.totalVenda)
    erros.push("Valor total de venda não informado.");

  // 🔁 Se for parcelado, validar financiamento
  if (
    dadosPrecificacao.parcelaSelecionada !== "avista" &&
    !dadosPrecificacao.financiamentoSelecionado
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
      {erros.map((erro, i) => (
        <div key={i} className="toast toast-top toast-end z-50">
          <div className="alert alert-error">
            <span>{erro}</span>
          </div>
        </div>
      ))}
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

      {/* 🎯 Botões */}
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
