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

  // 🔹 compat: precificacaoId na URL hoje é o orcamentoId
  const precificacaoId = searchParams.get("precificacaoId");
  const orcamentoIdFromQuery = searchParams.get("orcamentoId");
  const orcamentoId = orcamentoIdFromQuery ?? precificacaoId;

  const [cliente, setCliente] = useState<any>(null);
  const [projeto, setProjeto] = useState<any>(null);
  const [dadosOrcamento, setDadosOrcamento] = useState<any>(null);

  const [templateSelecionado, setTemplateSelecionado] = useState("");
  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  // 🔹 Carrega cliente, projeto e orçamento (igual proposta)
  useEffect(() => {
    const fetchData = async () => {
      if (!clienteId || !projetoId || !orcamentoId) return;

      try {
        // Cliente
        const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
        if (clienteSnap.exists()) setCliente(clienteSnap.data());

        // Projeto
        const projetoSnap = await getDoc(
          doc(db, "clientes", clienteId, "projetos", projetoId)
        );
        if (projetoSnap.exists()) setProjeto(projetoSnap.data());

        // Orçamento
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

  // 🔹 Carrega templates de contrato do Storage
  useEffect(() => {
    const fetchTemplates = async () => {
      const storageRef = ref(storage, "templates/contratos");
      const result = await listAll(storageRef);
      const nomes = result.items.map((item) => item.name);
      setTemplatesStorage(nomes);
    };
    fetchTemplates();
  }, []);

  // 🔹 Mesma lógica de forma de pagamento da proposta
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

  // 🔹 Monta os campos usados no template de CONTRATO
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

    const financiamento = dadosOrcamento?.financiamentoSelecionado;
    const valorFinalProjeto = Number(
      financiamento?.valorFinalProjeto ?? financiamento?.totalPago ?? 0
    );

    const campos: Record<string, string> = {
      // 🧍 Cliente
      nome_cliente: nomeClienteCampo || "---",
      cpf: cpfOuCnpjCampo || "---",
      rg: cliente.rg || "---",
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

      // 🔧 Projeto
      nome_projeto: projeto?.nomeProjeto || "---",
      quantidade_placas: String(qtdPlacasUsadas),
      potencia_placas: `${projeto.potenciaPlaca} W`,
      potencia_instalada: `${
        projeto.modo === "manual"
          ? projeto.potenciaPicoManual ?? projeto.potenciaPico
          : projeto.potenciaPico ?? projeto.potenciaPicoManual
      } kWp`,
      geracao_media: `${geracaoMensal} kWh/mês`,
      area_necessaria: `${projeto.areaMinimaTotal} m²`,

      // 🧱 Estrutura + inversor → do PROJETO
      estrutura: projeto.estruturaProjeto || "---",
      inversor_microinversor: projeto.tipoInversor ?? "---",
      qtd_inversor_microinversor: String(
        projeto.quantidadeInversor ?? "---"
      ),
      potencia_inversor_microinversor: projeto.potenciaInversorDigitada
        ? `${projeto.potenciaInversorDigitada} kWp`
        : "---",

      // ⚡ Consumos
      consumo_medio_mensal: String(consumoMedioMensal),
      consumo_medio_diario: String(consumoMedioDiario),

      // 💰 Financeiro – usa valor FINAL do projeto
      forma_pagamento: gerarFormaPagamento(dadosOrcamento),
      valor_a_vista: valorFinalProjeto
        ? `R$ ${valorFinalProjeto.toFixed(2)}`
        : "---",
    };

    return campos;
  };

  // 🔹 Validação (baseada na da proposta, mas com RG obrigatório p/ PF)
  function validarCamposContrato({
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

    // 📌 Cliente
    const tipoPessoa = String(cliente?.tipoPessoa || "").toLowerCase();
    if (isVazio(tipoPessoa) || !["pf", "pj"].includes(tipoPessoa)) {
      erros.push("Tipo de pessoa inválido ou não informado.");
    }

    const nomeCliente =
      cliente?.tipoPessoa === "pj"
        ? cliente?.razaoSocial
        : cliente?.nomeCliente;
    const cpfOuCnpj =
      cliente?.tipoPessoa === "pj" ? cliente?.cnpj : cliente?.cpf;

    if (isVazio(nomeCliente)) erros.push("Nome do cliente não informado.");
    if (isVazio(cpfOuCnpj)) erros.push("CPF ou CNPJ não informado.");

    if (tipoPessoa === "pf" && isVazio(cliente?.rg)) {
      erros.push("RG não informado.");
    }
    if (isVazio(cliente?.telefone))
      erros.push("Telefone do cliente não informado.");

    const endereco = cliente?.enderecos?.[0];
    if (!endereco) {
      erros.push("Endereço principal não encontrado.");
    } else {
      if (isVazio(endereco.cidade)) erros.push("Cidade não informada.");
      if (isVazio(endereco.estado)) erros.push("Estado não informado.");
      if (isVazio(endereco.endereco))
        erros.push("Logradouro não informado.");
      if (isVazio(endereco.numero))
        erros.push("Número do endereço não informado.");
      if (isVazio(endereco.cep)) erros.push("CEP não informado.");
    }

    // 📌 Projeto
    if (isVazio(projeto?.nomeProjeto))
      erros.push("Nome do projeto não informado.");
    if (isVazio(projeto?.potenciaPlaca))
      erros.push("Potência da placa não informada.");
    if (isVazio(projeto?.areaMinimaTotal))
      erros.push("Área mínima não informada.");

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

    // Estrutura + inversor (do PROJETO)
    if (isVazio(projeto?.estruturaProjeto))
      erros.push("Estrutura do projeto não informada.");
    if (!projeto?.quantidadeInversor)
      erros.push("Quantidade de inversores não informada.");
    if (isVazio(projeto?.tipoInversor))
      erros.push("Tipo de inversor não informado.");
    if (!projeto?.potenciaInversorDigitada)
      erros.push("Potência do inversor não informada.");

    // 💰 Orçamento
    const financiamento = dadosOrcamento?.financiamentoSelecionado;
    const valorFinalProjeto =
      financiamento?.valorFinalProjeto ?? financiamento?.totalPago;

    if (!valorFinalProjeto || valorFinalProjeto <= 0) {
      erros.push("Valor final do projeto não informado.");
    }

    if (
      dadosOrcamento?.parcelaSelecionada !== "avista" &&
      !dadosOrcamento?.financiamentoSelecionado
    ) {
      erros.push("Dados de financiamento não informados.");
    }

    return erros;
  }

  const handleGerarContrato = async () => {
    const errosValidacao = validarCamposContrato({
      cliente,
      projeto,
      dadosOrcamento,
    });

    if (errosValidacao.length > 0) {
      setErros(errosValidacao);
      return;
    }

    if (!templateSelecionado || !cliente || !projeto || !dadosOrcamento) {
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
          campos,
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar contrato");

      const blob = await response.blob();

      const limparNome = (texto: string) =>
        texto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_-]/g, "");

      const nomeProjeto = projeto?.nomeProjeto || "SemProjeto";

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

  // 🔹 limpa toasts depois de 5s
  useEffect(() => {
    if (erros.length > 0) {
      const timer = setTimeout(() => setErros([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [erros]);

  if (!cliente || !projeto) {
    return <div className="text-white p-10">Carregando contrato...</div>;
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

      <h1 className="text-3xl font-bold text-center">Gerar Contrato 📄</h1>

      {/* Usa o mesmo resumo, passando o orçamento */}
      <ResumoProjeto
        cliente={cliente}
        projeto={projeto}
        dadosOrcamento={dadosOrcamento}
        variante="contrato"
      />

      {/* Seletor de template de contrato */}
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

      {/* Botões */}
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
