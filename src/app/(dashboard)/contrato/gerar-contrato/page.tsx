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
      total_venda: dadosPrecificacao?.totalVenda?.toFixed(2) || "---",
  
      qtd_inversor_microinversor:
        dadosPrecificacao?.quantidadeInversor ?? "---",
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
      setErros(errosValidacao); // <- usar estado como você já fez na proposta
      return;
    }

    if (!templateSelecionado || !cliente || !projeto || !dadosPrecificacao) {
      alert("Preencha todas as informações antes de gerar o contrato.");
      return;
    }

    try {
      setGerando(true);
      const campos = montarCampos();

      const response = await fetch("/api/gerar-contrato-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateSelecionado, campos }),
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

    // 📌 Cliente
    if (!cliente.tipoPessoa) erros.push("Tipo de pessoa não informado.");
    if (cliente.tipoPessoa === "pj" && !cliente.cnpj)
      erros.push("CNPJ não informado.");
    if (cliente.tipoPessoa === "pf" && !cliente.cpf)
      erros.push("CPF não informado.");
    if (!cliente.telefone) erros.push("Telefone do cliente não informado.");
    if (!cliente.enderecos?.[0]?.cidade)
      erros.push("Cidade do cliente não informada.");
    if (cliente.tipoPessoa === "pf" && !cliente.rg)
      erros.push("RG do cliente não informado.");   
    if (!cliente.enderecos?.[0]?.estado)
      erros.push("Estado do cliente não informado.");
    if (cliente.tipoPessoa === "pf" && !cliente.rg)
      erros.push("RG do cliente não informado.");

    // 📌 Projeto
    if (!projeto.nomeProjeto) erros.push("Nome do projeto não informado.");
    if (!projeto.potenciaPlaca) erros.push("Potência da placa não informada.");
    if (!projeto.potenciaPico) erros.push("Potência pico não informada.");
    if (!projeto.areaMinimaTotal) erros.push("Área mínima não informada.");

    if (projeto.modo === "manual") {
      if (!projeto.qtdPlacasManual)
        erros.push("Qtd. de placas (manual) não informada.");
      if (!projeto.geracaoMensalManual)
        erros.push("Geração mensal (manual) não informada.");
    }

    if (projeto.modo === "recomendado") {
      if (!projeto.qtdPlacas)
        erros.push("Qtd. de placas (recomendada) não informada.");
      if (!projeto.geracaoMensal)
        erros.push("Geração mensal (recomendada) não informada.");
    }

    // 📌 Precificação
    if (!dadosPrecificacao.kitFotovoltaico)
      erros.push("Valor do kit fotovoltaico não informado.");
    if (!dadosPrecificacao.totalVenda)
      erros.push("Valor total de venda não informado.");
    if (!dadosPrecificacao.tipoInversor)
      erros.push("Tipo de inversor não informado.");
    if (!dadosPrecificacao.quantidadeInversor)
      erros.push("Qtd. de inversores não informada.");
    if (!dadosPrecificacao.potenciaInversorDigitada)
      erros.push("Potência do inversor não informada.");

    if (
      dadosPrecificacao.parcelaSelecionada !== "avista" &&
      !dadosPrecificacao.financiamentoSelecionado
    ) {
      erros.push("Dados do financiamento não informados.");
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
          disabled={gerando || !templateSelecionado}
          className="btn btn-primary"
        >
          {gerando ? "Gerando..." : "Gerar Contrato"}
        </button>
      </div>
    </section>
  );
}
