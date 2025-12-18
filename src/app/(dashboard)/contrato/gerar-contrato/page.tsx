// ✅ Página: /contrato/gerar-contrato/page.tsx
"use client"; 
// 🔹 Indica que este componente será renderizado no lado do cliente (necessário para hooks, etc).

import { useEffect, useState } from "react";
// 🔹 Hooks do React:
//    - useState: para estados locais (cliente, projeto, template, etc).
//    - useEffect: para carregar dados assíncronos quando a página monta.

import { useRouter, useSearchParams } from "next/navigation";
// 🔹 Hooks do Next.js (App Router):
//    - useRouter: navegação programática (router.push).
//    - useSearchParams: leitura de parâmetros de query string (clienteId, projetoId, etc).

import { db } from "@/firebase/firebaseConfig";
// 🔹 Instância configurada do Firestore (banco de dados do Firebase).

import { 
  doc, 
  getDoc, 
  updateDoc, // 🔹 Função para atualizar documentos existentes no Firestore.
  Timestamp, // 🔹 Tipo especial do Firestore para representar datas.
} from "firebase/firestore";
// 🔹 Funções do Firestore usadas nesta página:
//    - doc: cria uma referência a um documento específico.
//    - getDoc: obtém os dados de um único documento.
//    - updateDoc: atualiza campos de um documento já existente.
//    - Timestamp: usado para campos de data/hora (ultimaModificacao).

import { getStorage, ref, listAll } from "firebase/storage";
// 🔹 Funções do Storage (arquivos):
//    - getStorage: obtém a instância do Storage.
//    - ref: cria referência a uma pasta/arquivo no Storage.
//    - listAll: lista todos os arquivos dentro de uma pasta.

import { saveAs } from "file-saver";
// 🔹 Biblioteca para forçar download de um arquivo blob no navegador.

import ResumoProjeto from "@/components/ResumoProjeto";
// 🔹 Componente que mostra um resumo do cliente, projeto e orçamento.

const storage = getStorage();
// 🔹 Instância global do Storage para fazer listagem de templates.

export default function GerarContratoPage() {
  const router = useRouter(); 
  // 🔹 Hook de navegação para mudar de rota (voltar, etc.).

  const searchParams = useSearchParams();
  // 🔹 Hook para ler parâmetros da URL (query string).

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");

  // 🔹 compat: precificacaoId na URL hoje é o orcamentoId
  //    Isso é só para manter compatibilidade com URLs antigas.
  const precificacaoId = searchParams.get("precificacaoId");
  const orcamentoIdFromQuery = searchParams.get("orcamentoId");
  const orcamentoId = orcamentoIdFromQuery ?? precificacaoId;
  // 🔹 orcamentoId será usado tanto para ler quanto para atualizar o documento de orçamento.

  const [cliente, setCliente] = useState<any>(null);
  // 🔹 Dados do cliente carregados do Firestore.

  const [projeto, setProjeto] = useState<any>(null);
  // 🔹 Dados do projeto (consumo, geração, quantidade de placas, etc.).

  const [dadosOrcamento, setDadosOrcamento] = useState<any>(null);
  // 🔹 Dados do orçamento selecionado (financiamento, valores, etc.).

  const [templateSelecionado, setTemplateSelecionado] = useState("");
  // 🔹 Nome do template de contrato escolhido pelo usuário (arquivo .docx no Storage).

  const [templatesStorage, setTemplatesStorage] = useState<string[]>([]);
  // 🔹 Lista de nomes de templates de contrato disponíveis no Storage.

  const [gerando, setGerando] = useState(false);
  // 🔹 Flag para indicar se estamos gerando o contrato (evita clique duplo, mostra loading).

  const [erros, setErros] = useState<string[]>([]);
  // 🔹 Lista de mensagens de erro de validação ou carregamento de dados.

  // 🔹 Carrega cliente, projeto e orçamento (fluxo semelhante ao usado na proposta).
  useEffect(() => {
    const fetchData = async () => {
      // 👉 Se faltar algum ID essencial, não há como carregar os dados.
      if (!clienteId || !projetoId || !orcamentoId) return;

      try {
        // 🔹 Busca o documento do cliente na coleção "clientes".
        const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
        if (clienteSnap.exists()) setCliente(clienteSnap.data());

        // 🔹 Busca o documento do projeto dentro da subcoleção "projetos" do cliente.
        const projetoSnap = await getDoc(
          doc(db, "clientes", clienteId, "projetos", projetoId)
        );
        if (projetoSnap.exists()) setProjeto(projetoSnap.data());

        // 🔹 Busca o documento do orçamento dentro de "orcamentos" do projeto.
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
          // 👉 Salva os dados do orçamento no estado local.
          setDadosOrcamento(orcSnap.data());
        } else {
          // 👉 Caso não exista orçamento com esse ID, registra erro.
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
    // 🔎 Dependências: quando clienteId, projetoId ou orcamentoId mudarem, recarrega os dados.
  }, [clienteId, projetoId, orcamentoId]);

  // 🔹 Carrega templates de contrato do Storage (pasta "templates/contratos").
  useEffect(() => {
    const fetchTemplates = async () => {
      // 👉 Cria uma referência à pasta "templates/contratos" no Storage.
      const storageRef = ref(storage, "templates/contratos");

      // 👉 Lista todos os arquivos dentro dessa pasta.
      const result = await listAll(storageRef);

      // 👉 Mapeia apenas os nomes dos arquivos .docx.
      const nomes = result.items.map((item) => item.name);

      // 👉 Salva no estado para renderizar no <select>.
      setTemplatesStorage(nomes);
    };

    fetchTemplates();
  }, []);

  // 🔹 Lógica copiada/adaptada da proposta para descrição da forma de pagamento.
  function gerarFormaPagamento(dados: any): string {
    if (!dados) return "---";

    const entrada = Number(dados.entrada || 0);
    const parcelas = dados.parcelaSelecionada;
    const fin = dados.financiamentoSelecionado;

    const format = (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // 🔹 Caso não exista financiamento estruturado, tenta cair para um total à vista.
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

  // 🔹 Monta os campos dinâmicos usados no template de CONTRATO.
  const montarCampos = () => {
    const enderecoPrincipal = cliente.enderecos?.[0] || {};
    // 🔹 Considera o primeiro endereço do array como endereço principal.

    const nomeClienteCampo =
      cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;
    // 🔹 Se for pessoa jurídica, usa razão social; caso contrário, nome do cliente.

    const cpfOuCnpjCampo =
      cliente.tipoPessoa === "pj" ? cliente.cnpj : cliente.cpf;
    // 🔹 Campo que será usado como CPF ou CNPJ conforme o tipo de pessoa.

    const nomeClienteAssinaturaCampo =
      cliente.tipoPessoa === "pj" ? cliente.razaoSocial : cliente.nomeCliente;
    // 🔹 Nome exibido na assinatura do contrato.

    const qtdPlacasUsadas =
      projeto.modo === "manual"
        ? projeto.qtdPlacasManual || projeto.qtdPlacas || "---"
        : projeto.qtdPlacas || projeto.qtdPlacasManual || "---";
    // 🔹 Quantidade de placas usada (respeitando o modo do projeto).

    const geracaoMensal =
      projeto.modo === "manual"
        ? projeto.geracaoMensalManual ?? projeto.geracaoMensal ?? "---"
        : projeto.geracaoMensal ?? projeto.geracaoMensalManual ?? "---";
    // 🔹 Geração mensal estimada (modo manual ou recomendado).

    const consumoMedioMensal =
      projeto.modo === "manual"
        ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes ?? "---"
        : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual ?? "---";
    // 🔹 Consumo médio mensal.

    const consumoMedioDiario =
      projeto.modo === "manual"
        ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia ?? "---"
        : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual ?? "---";
    // 🔹 Consumo médio diário.

    const financiamento = dadosOrcamento?.financiamentoSelecionado;
    const valorFinalProjeto = Number(
      financiamento?.valorFinalProjeto ?? financiamento?.totalPago ?? 0
    );
    // 🔹 Valor final do projeto (total a ser pago).

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

  // 🔹 Função de validação dos dados antes de gerar o contrato.
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
    // 🔹 Primeiro, valida todos os dados necessários para o contrato.
    const errosValidacao = validarCamposContrato({
      cliente,
      projeto,
      dadosOrcamento,
    });

    if (errosValidacao.length > 0) {
      // 👉 Se houver erros de validação, exibe-os e interrompe o fluxo.
      setErros(errosValidacao);
      return;
    }

    // 🔹 Garante que temos tudo que é essencial antes de seguir.
    if (!templateSelecionado || !cliente || !projeto || !dadosOrcamento) {
      alert("Preencha todas as informações antes de gerar o contrato.");
      return;
    }

    // 🔹 Também garante que temos os IDs necessários para depois atualizar o Firestore.
    if (!clienteId || !projetoId || !orcamentoId) {
      alert("IDs ausentes na URL (clienteId / projetoId / orcamentoId).");
      return;
    }

    try {
      setGerando(true);

      // 🔹 Monta o objeto de campos que será usado para preencher o template .docx.
      const campos = montarCampos();

      // 🔹 Chama a API interna que pega o template .docx, faz replace dos campos e devolve o arquivo pronto.
      const response = await fetch("/api/gerar-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: `contratos/${templateSelecionado}`,
          campos,
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar contrato");

      // 🔹 Converte a resposta em blob (arquivo binário) para poder forçar o download.
      const blob = await response.blob();

      // 🔹 Função auxiliar para limpar strings e formar um nome de arquivo "seguro".
      const limparNome = (texto: string) =>
        texto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_-]/g, "");

      const nomeProjeto = projeto?.nomeProjeto || "SemProjeto";

      // 🔹 Monta o nome final do arquivo: "Contrato-NomeCliente-NomeProjeto-YYYY-MM-DD.docx".
      const nomeArquivo = `Contrato-${limparNome(
        cliente.nomeCliente
      )}-${limparNome(nomeProjeto)}-${
        new Date().toISOString().split("T")[0]
      }.docx`;

      // 🔹 Inicia o download do arquivo gerado no navegador do usuário.
      saveAs(blob, nomeArquivo);

      await updateDoc(
        doc(
          db,
          "clientes",
          clienteId,
          "projetos",
          projetoId,
          "orcamentos",
          orcamentoId
        ),
        {
          status: "finalizado", 
          // 🔸 Marca este orçamento como finalizado.

          ultimaModificacao: Timestamp.now(), 
          // 🔸 Atualiza a data de modificação do orçamento.
        }
      );

      // 🔹 2) Marca o PROJETO como "finalizado"
      // ✅ ESSA É A PARTE QUE FAZ A NOVA TELA /projeto FICAR RÁPIDA
      await updateDoc(
        doc(db, "clientes", clienteId, "projetos", projetoId),
        {
          statusProjeto: "finalizado", 
          // ✅ Campo novo: a tela /projeto vai ler isso direto,
          //    e NÃO vai mais precisar entrar em /orcamentos.

          ultimaModificacao: Timestamp.now(), 
          // 🔸 Atualiza a data de modificação do projeto também.
          
          contratoGeradoEm: Timestamp.now(),
          // ✅ Opcional (mas MUITO útil): guarda quando o contrato foi gerado.

          contratoOrcamentoId: orcamentoId,
          // ✅ Opcional (mas útil): guarda qual orçamento virou contrato.
        }
      );

      alert("Contrato gerado e projeto marcado como finalizado com sucesso!");

    } catch (error) {
      console.error("❌ Erro ao gerar contrato:", error);
      alert("Erro ao gerar contrato. Verifique os dados e tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  // 🔹 Efeito responsável por limpar os erros de validação após 5 segundos.
  useEffect(() => {
    if (erros.length > 0) {
      const timer = setTimeout(() => setErros([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [erros]);

  // 🔹 Enquanto cliente ou projeto não estiverem carregados, mostra uma mensagem simples.
  if (!cliente || !projeto) {
    return <div className="text-white p-10">Carregando contrato...</div>;
  }

  // 🔹 Render principal da página de geração de contrato.
  return (
    <section className="text-white px-6 py-6 space-y-8">
      {/* 🔹 Toast de erros (lado superior direito) */}
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

      {/* 🔹 Usa o mesmo componente de resumo do projeto, passando o orçamento. */}
      <ResumoProjeto
        cliente={cliente}
        projeto={projeto}
        dadosOrcamento={dadosOrcamento}
        variante="contrato"
      />

      {/* 🔹 Seletor de template de contrato vindo do Storage */}
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

      {/* 🔹 Botões de ação (voltar / gerar contrato) */}
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
