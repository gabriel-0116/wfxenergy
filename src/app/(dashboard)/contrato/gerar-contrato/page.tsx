// ✅ Página: /contrato/gerar-contrato/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, listAll } from "firebase/storage";
import { saveAs } from "file-saver";
import ResumoProjeto from "@/components/ResumoProjeto";

const storage = getStorage();

export default function GerarContratoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  const precificacaoId = searchParams.get("precificacaoId");

  const [cliente, setCliente] = useState<any>(null);
  const [projeto, setProjeto] = useState<any>(null);
  const [dadosPrecificacao, setDadosPrecificacao] = useState<any>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState("");
  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    if (!clienteId || !projetoId || !precificacaoId) return;

    const fetchData = async () => {
      const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
      const projetoSnap = await getDoc(
        doc(db, "clientes", clienteId, "projetos", projetoId)
      );
      const precSnap = await getDoc(
        doc(
          db,
          "clientes",
          clienteId,
          "projetos",
          projetoId,
          "precificacao",
          precificacaoId,
          "dadosPrecificacao",
          precificacaoId
        )
      );

      if (clienteSnap.exists()) setCliente(clienteSnap.data());
      if (projetoSnap.exists()) setProjeto(projetoSnap.data());
      if (precSnap.exists()) setDadosPrecificacao(precSnap.data());
    };

    fetchData();
  }, [clienteId, projetoId, precificacaoId]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const storageRef = ref(storage, "templates/contratos");
      const result = await listAll(storageRef);
      const nomes = result.items.map((item) => item.name);
      setTemplatesStorage(nomes);
    };
    fetchTemplates();
  }, []);

  const montarCampos = () => {
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

    const geracaoMensal =
      projeto.modo === "manual"
        ? projeto.geracaoMensalManual ?? projeto.geracaoMensal ?? "---"
        : projeto.geracaoMensal ?? projeto.geracaoMensalManual ?? "---";

    const consumoMedioMensal =
      projeto.modo === "manual"
        ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes ?? "---"
        : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual ?? "---";

    const consumoMedioDiario =
      projeto.modo === "manual"
        ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia ?? "---"
        : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual ?? "---";

    const entrada = parseFloat(dadosPrecificacao?.entrada || "0");
    const totalPago =
      dadosPrecificacao?.financiamentoSelecionado?.totalPago || 0;
    const totalFinanciado = entrada + totalPago;

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

    // ✅ Campos que serão enviados para o Docxtemplater
    const campos: Record<string, string> = {
      nome_cliente: nomeClienteCampo || "---",
      cpf: cpfOuCnpjCampo || "---",
      rg: cliente.rg || "---",
      telefone: cliente.telefone || "---",
      cidade: enderecoPrincipal.cidade || "---",
      estado: enderecoPrincipal.estado || "---",
      logradouro: enderecoPrincipal.endereco || "---",
      numero: enderecoPrincipal.numero || "---",
      cep: enderecoPrincipal.cep || "---",
      criado_em: new Date().toLocaleDateString("pt-BR"),
      validade: "7 dias",
      nome_projeto: projeto?.nomeProjeto || "---",

      potencia_instalada: `${projeto.potenciaPico} kWp`,
      geracao_media: `${geracaoMensal} kWh/mês`,
      quantidade_placas: qtdPlacasUsadas,
      potencia_placas: `${projeto.potenciaPlaca} W`,

      forma_pagamento: gerarFormaPagamento(dadosPrecificacao),
      valor_a_vista: dadosPrecificacao?.totalVenda
        ? `R$ ${dadosPrecificacao.totalVenda.toFixed(2)}`
        : "---",

      qtd_inversor_microinversor:
        dadosPrecificacao?.quantidadeInversor ?? "---",
      inversor_microinversor: dadosPrecificacao.tipoInversor ?? "---",
      estrutura: dadosPrecificacao?.estruturaProjeto || "---",
      area_necessaria: `${projeto.areaMinimaTotal} m²`,
      potencia_inversor_microinversor:
        dadosPrecificacao?.potenciaInversorDigitada
          ? `${dadosPrecificacao.potenciaInversorDigitada} kWp`
          : "---",

      data_assinatura: new Date().toLocaleDateString("pt-BR"),
      nome_cliente_assinatura: nomeClienteAssinaturaCampo || "---",
      consumo_medio_mensal: consumoMedioMensal,
      consumo_medio_diario: consumoMedioDiario,
    };

    return campos;
  };

  const handleGerarContrato = async () => {
    const errosValidacao = validarCamposContrato({
      cliente,
      projeto,
      dadosPrecificacao,
    });

    if (errosValidacao.length > 0) {
      console.log("Dados usados na validação:", {
        cliente,
        projeto,
        dadosPrecificacao,
      });
      console.warn("Erros encontrados:", errosValidacao);
      setErros(errosValidacao);
      return;
    }

    if (!templateSelecionado || !cliente || !projeto || !dadosPrecificacao) {
      alert("Preencha todas as informações antes de gerar o contrato.");
      return;
    }

    try {
      setGerando(true);
      const campos = montarCampos();

      const response = await fetch("/api/gerar-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: `contratos/${templateSelecionado}`,
          campos, // já montado antes
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar contrato");

      const blob = await response.blob();

      // 🔧 Função para limpar o nome (tirar acentos, espaços, caracteres especiais)
      const limparNome = (texto: string) =>
        texto
          .normalize("NFD") // Normaliza caracteres acentuados
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .replace(/\s+/g, "_") // Substitui espaços por underscore
          .replace(/[^a-zA-Z0-9_-]/g, ""); // Remove outros caracteres especiais

      // ✅ Garantir que nome do projeto exista, senão usa 'SemProjeto'
      const nomeProjeto = projeto?.nomeProjeto || "SemProjeto";

      // 📁 Monta nome do arquivo com cliente + projeto + data
      const nomeArquivo = `Contrato-${limparNome(
        cliente.nomeCliente
      )}-${limparNome(nomeProjeto)}-${
        new Date().toISOString().split("T")[0]
      }.docx`;

      saveAs(blob, nomeArquivo);
    } catch (error) {
      console.error("❌ Erro ao gerar contrato:", error);
      alert("Erro ao gerar contrato. Verifique os dados e tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  function validarCamposContrato({
    cliente,
    projeto,
    dadosPrecificacao,
  }: {
    cliente: any;
    projeto: any;
    dadosPrecificacao: any;
  }): string[] {
    const erros: string[] = [];

    // 🔍 Função utilitária para verificar strings vazias ou valores ausentes
    const isInvalido = (valor: any): boolean =>
      valor === undefined ||
      valor === null ||
      (typeof valor === "string" && valor.trim() === "");

    // 📌 Cliente
    const tipoPessoa = String(cliente.tipoPessoa).toLowerCase();
    if (isInvalido(tipoPessoa) || !["pf", "pj"].includes(tipoPessoa)) {
      erros.push("Tipo de pessoa inválido ou não informado.");
    }

    const nomeCliente =
      cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;
    const cpfOuCnpj = cliente.tipoPessoa === "pj" ? cliente.cnpj : cliente.cpf;

    if (isInvalido(nomeCliente)) erros.push("Nome do cliente não informado.");
    if (isInvalido(cpfOuCnpj)) erros.push("CPF ou CNPJ não informado.");

    if (tipoPessoa === "pf" && isInvalido(cliente.rg)) {
      erros.push("RG não informado.");
    }
    if (isInvalido(cliente.telefone))
      erros.push("Telefone do cliente não informado.");

    const endereco = cliente.enderecos?.[0];
    if (!endereco) {
      erros.push("Endereço principal não encontrado.");
    } else {
      if (isInvalido(endereco.cidade)) erros.push("Cidade não informada.");
      if (isInvalido(endereco.estado)) erros.push("Estado não informado.");
      if (isInvalido(endereco.endereco))
        erros.push("Logradouro não informado.");
      if (isInvalido(endereco.numero))
        erros.push("Número do endereço não informado.");
      if (isInvalido(endereco.cep)) erros.push("CEP não informado.");
    }

    // 📌 Projeto
    if (isInvalido(projeto.nomeProjeto))
      erros.push("Nome do projeto não informado.");
    if (!projeto.potenciaPlaca) erros.push("Potência da placa não informada.");
    if (!projeto.potenciaPico) erros.push("Potência pico não informada.");
    if (!projeto.areaMinimaTotal) erros.push("Área mínima não informada.");

    const qtdPlacas =
      projeto.modo === "manual" ? projeto.qtdPlacasManual : projeto.qtdPlacas;
    const geracaoMensal =
      projeto.modo === "manual"
        ? projeto.geracaoMensalManual
        : projeto.geracaoMensal;
    const consumoMensal =
      projeto.modo === "manual"
        ? projeto.consumoMedioMesManual
        : projeto.consumoMedioMes;
    const consumoDiario =
      projeto.modo === "manual"
        ? projeto.consumoMedioDiaManual
        : projeto.consumoMedioDia;

    if (!qtdPlacas) erros.push("Quantidade de placas não informada.");
    if (!geracaoMensal) erros.push("Geração mensal não informada.");
    if (!consumoMensal) erros.push("Consumo médio mensal não informado.");
    if (!consumoDiario) erros.push("Consumo médio diário não informado.");

    // 📌 Precificação
    if (isInvalido(dadosPrecificacao?.estruturaProjeto))
      erros.push("Estrutura do projeto não informada.");
    if (!dadosPrecificacao?.quantidadeInversor)
      erros.push("Quantidade de inversores não informada.");
    if (isInvalido(dadosPrecificacao?.tipoInversor))
      erros.push("Tipo de inversor não informado.");
    if (isInvalido(dadosPrecificacao?.potenciaInversorDigitada))
      erros.push("Potência do inversor não informada.");
    if (!dadosPrecificacao?.totalVenda)
      erros.push("Valor total de venda não informado.");

    if (
      dadosPrecificacao.parcelaSelecionada !== "avista" &&
      !dadosPrecificacao.financiamentoSelecionado
    ) {
      erros.push("Dados de financiamento não informados.");
    }

    return erros;
  }

  useEffect(() => {
    if (erros.length > 0) {
      const timer = setTimeout(() => {
        setErros([]);
      }, 5000); // esconde após 5 segundos
      return () => clearTimeout(timer);
    }
  }, [erros]);

  if (!cliente || !projeto || !dadosPrecificacao) {
    return <div className="text-white p-10">Carregando contrato...</div>;
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
      <h1 className="text-3xl font-bold text-center">Gerar Contrato 📄</h1>

      {/* 🔁 Resumo reutilizável */}
      <ResumoProjeto
        cliente={cliente}
        projeto={projeto}
        dadosPrecificacao={dadosPrecificacao}
        variante="contrato"
      />

      {/* 📄 Seletor de template */}
      <div className="max-w-md mx-auto">
        <label htmlFor="template" className="block font-semibold mb-2">
          Escolha o template de contrato:
        </label>
        <select
          id="template"
          className="select select-bordered w-full"
          value={templateSelecionado}
          onChange={(e) => setTemplateSelecionado(e.target.value)}
        >
          <option value="">Selecione um template</option>
          {templatesStorage.map((template) => (
            <option key={template} value={template}>
              {template.replace(".docx", "")}
            </option>
          ))}
        </select>
      </div>

      {/* 🎯 Botões */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => router.push("/contrato")}
          className="btn btn-outline"
        >
          Voltar
        </button>
        <button
          onClick={handleGerarContrato}
          className="btn w-40 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
          disabled={gerando || !templateSelecionado || erros.length > 0}
        >
          {gerando ? "Gerando..." : "Gerar Contrato"}
        </button>
      </div>
    </section>
  );
}
