"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faBolt,
  faClipboard,
  faExclamation,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { nomesLegiveis } from "@/utils/nomesLegiveis";

export default function DadosPrecificacao() {
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  const router = useRouter();
  const precificacaoId = searchParams.get("precificacaoId");
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // 🔁 Estados de projeto
  const [modo, setModo] = useState("recomendado");
  const [qtdPlacas, setQtdPlacas] = useState<number | null>(null);
  const [qtdPlacasManual, setQtdPlacasManual] = useState<number | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [potenciaInversor, setPotenciaInversor] = useState(0);
  const [potenciaInversorManual, setPotenciaInversorManual] = useState(0);
  const [areaMinima, setAreaMinima] = useState(0);
  const [potenciaPlaca, setPotenciaPlaca] = useState(0);
  const [potenciaPico, setPotenciaPico] = useState(0);
  const [potenciaPicoManual, setPotenciaPicoManual] = useState(0);
  const [geracaoMensal, setGeracaoMensal] = useState(0);
  const [geracaoMensalManual, setGeracaoMensalManual] = useState(0);
  const [geracaoDiaria, setGeracaoDiaria] = useState(0);
  const [geracaoDiariaManual, setGeracaoDiariaManual] = useState(0);
  const [totalComImposto, setTotalComImposto] = useState(0);
  const [consumoMedioMes, setConsumoMedioMes] = useState(0);
  const [consumoMedioDia, setConsumoMedioDia] = useState(0);
  const [estruturaProjeto, setEstruturaProjeto] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("");

  // 🔧 Valores editáveis como string para permitir apagar "0"
  const [kitFotovoltaico, setKitFotovoltaico] = useState("");
  const [valorProjeto, setValorProjeto] = useState("62.7"); // ✅ valor padrão
  const [valorPlacaAdvertencia, setValorPlacaAdvertencia] = useState("60"); // ✅ valor padrão
  const [margemLucroBruta, setMargemLucroBruta] = useState("27"); // ✅ já tá certo
  const [porcentagemComissao, setPorcentagemComissao] = useState("3"); // ✅ valor padrão
  const [valorEletricistaUnit, setValorEletricistaUnit] = useState("200"); // ✅ valor padrão
  const [valorInfraUnit, setValorInfraUnit] = useState("62.5"); // ✅ valor padrão
  const [valorComissaoUnit, setValorComissaoUnit] = useState("50"); // ✅ valor padrão
  const [porcentagemImposto, setPorcentagemImposto] = useState("7"); // valor padrão 7%
  const [desconto, setDesconto] = useState("0"); // ✅ valor padrão
  const [entrada, setEntrada] = useState("0");
  const [potenciaInversorDigitada, setPotenciaInversorDigitada] =
    useState<string>("");
  const [juros, setJuros] = useState("0");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [tipoInversor, setTipoInversor] = useState("");
  const [quantidadeInversor, setQuantidadeInversor] = useState("");
  const [parcelaSelecionada, setParcelaSelecionada] = useState<
    number | "avista" | null
  >(null);
  const [editEletricista, setEditEletricista] = useState(false);
  const [editInfra, setEditInfra] = useState(false);
  const [editImposto, setEditImposto] = useState(false); // ativar/desativar imposto
  const [editComissao, setEditComissao] = useState(true);
  const [opcoesFinanciamento, setOpcoesFinanciamento] = useState([
    { parcelas: 12, taxa: 2.3 },
    { parcelas: 18, taxa: 2.5 },
    { parcelas: 24, taxa: 2.7 },
    { parcelas: 36, taxa: 2.9 },
    { parcelas: 48, taxa: 3.1 },
    { parcelas: 60, taxa: 3.3 },
    { parcelas: 72, taxa: 3.5 },
  ]);
  const [quantidadePlacas, setQuantidadePlacas] = useState<string>("0");
  const [dadosAntigos, setDadosAntigos] = useState<any>({});

  const parseDecimal = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    return parseFloat(String(valor).replace(",", ".").trim()) || 0;
  };

  const placas = modo === "manual" ? qtdPlacasManual : qtdPlacas;
  const numPlacas = placas || 0;
  const custoEletricista =
    numPlacas * parseDecimal(valorEletricistaUnit || "0");
  const custoInfra = numPlacas * parseDecimal(valorInfraUnit || "0");
  const custoComissao = editComissao
    ? numPlacas * parseDecimal(valorComissaoUnit || "0")
    : 0;
  const valorVendaKit =
    parseDecimal(kitFotovoltaico) +
    (parseDecimal(margemLucroBruta) / 100) * parseDecimal(kitFotovoltaico) -
    parseDecimal(desconto);
  const valorVendaEletricista = custoEletricista * 2;
  const lucroEletricista = valorVendaEletricista - custoEletricista;
  const totalVenda =
    valorVendaKit +
    parseDecimal(valorProjeto || "0") +
    parseDecimal(valorPlacaAdvertencia || "0") +
    valorVendaEletricista +
    custoInfra +
    custoComissao;
  const custoImposto = editImposto
    ? (parseDecimal(porcentagemImposto || "0") / 100) * totalVenda
    : 0;
  const totalCusto =
    parseDecimal(kitFotovoltaico || "0") +
    parseDecimal(valorProjeto || "0") +
    parseDecimal(valorPlacaAdvertencia || "0") +
    custoEletricista +
    custoInfra +
    custoComissao +
    custoImposto; // ✅ novo
  const valorLucroKit = valorVendaKit - parseDecimal(kitFotovoltaico || "0");
  const valorComissaoInterna =
    (parseDecimal(porcentagemComissao || "0") / 100) * totalVenda;
  const totalLucro = totalVenda - totalCusto - parseDecimal(desconto || "0");
  const lucroFinalComDescontoEComissaoEImposto =
    totalVenda - totalCusto - parseDecimal(desconto || "0");
  const placasUsadas = numPlacas;
  const faturamentoBrutoPorModulo =
    placasUsadas > 0 ? totalVenda / placasUsadas : 0;
  const faturamentoLiquidoPorModulo =
    placasUsadas > 0
      ? lucroFinalComDescontoEComissaoEImposto / placasUsadas
      : 0;
  const valorFinanciado = totalVenda - parseDecimal(entrada || "0");
  const margemLucroLiquida =
    totalVenda > 0
      ? ((lucroFinalComDescontoEComissaoEImposto / totalVenda) * 100).toFixed(0)
      : "0";

  const atualizarTaxa = (index: number, novaTaxa: number) => {
    const novaLista = [...opcoesFinanciamento];
    novaLista[index].taxa = novaTaxa;
    setOpcoesFinanciamento(novaLista);
  };

  const dadosParcelas = opcoesFinanciamento.map((opcao) => {
  // ✅ Conversão dos valores de entrada e custos
  const entradaNumber = parseDecimal(entrada || "0");
  const totalCustoNumber = parseDecimal(totalCusto?.toString() || "0");
  const valorComissaoInternaNumber = parseDecimal(
    valorComissaoInterna?.toString() || "0"
  );

  // 💰 Valor a ser financiado (total da venda - entrada do cliente)
  const valorFinanciadoNumber = totalVenda - entradaNumber;

  // ✅ Conversão da taxa de juros de porcentagem para decimal
  const taxaDecimal = opcao.taxa / 100;

  // 📌 Cálculo exato da parcela com fórmula PMT
  // PMT = PV * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
  const fatorPotencia = Math.pow(1 + taxaDecimal, opcao.parcelas);
  const valorParcela = valorFinanciadoNumber * (taxaDecimal * fatorPotencia) / (fatorPotencia - 1);

  // 💵 Total pago ao final do financiamento
  const totalPago = Math.ceil(opcao.parcelas * valorParcela * 100) / 100;

  // 📊 Juros em valor monetário
  const jurosReais = totalPago - valorFinanciadoNumber;

  // 📈 Juros em percentual sobre o valor financiado
  const jurosPercentual =
    valorFinanciadoNumber > 0
      ? (jurosReais / valorFinanciadoNumber) * 100
      : 0;

  // 💰 Valor final do projeto: totalPago + entrada
  const valorFinalProjeto = totalPago + entradaNumber;

  // 🧾 Lucro líquido do projeto
  const lucroFinal =
    valorFinalProjeto - totalCustoNumber - valorComissaoInternaNumber;

  // 📦 Retorno dos dados calculados
  return {
    ...opcao,
    valorParcela,
    totalPago,
    jurosReais,
    jurosPercentual,
    valorFinalProjeto,
    lucroFinal,
  };
});


  const potenciaPicoFinal =
    modo === "manual"
      ? potenciaPicoManual || potenciaPico
      : potenciaPico || potenciaPicoManual;

  const potenciaInversorFinal =
    modo === "manual"
      ? potenciaInversorManual || potenciaInversor
      : potenciaInversor || potenciaInversorManual;

  function sanitizeNumericInput(value: string) {
    return value.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  }

  useEffect(() => {
    const buscarProjeto = async () => {
      if (!clienteId || !projetoId) return;

      try {
        // 🔍 Busca os dados do projeto
        const docRef = doc(db, `clientes/${clienteId}/projetos/${projetoId}`);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();

          if (data.qtdPlacas) setQuantidadePlacas(String(data.qtdPlacas));
          if (data.qtdPlacas) setQtdPlacas(data.qtdPlacas);
          if (data.qtdPlacasManual) setQtdPlacasManual(data.qtdPlacasManual);
          if (data.consumoMedioMes) setConsumoMedioMes(data.consumoMedioMes);
          if (data.consumoMedioDia) setConsumoMedioDia(data.consumoMedioDia);
          if (data.modo) setModo(data.modo);
          if (data.potenciaPlaca) setPotenciaPlaca(data.potenciaPlaca);
          if (data.potenciaInversor) setPotenciaInversor(data.potenciaInversor);
          if (data.potenciaPico) setPotenciaPico(data.potenciaPico);
          if (data.nomeProjeto) setNomeProjeto(data.nomeProjeto); // 👈 nome do projeto
          if (data.potenciaPicoManual)
            setPotenciaPicoManual(data.potenciaPicoManual);
          if (data.potenciaInversorManual)
            setPotenciaInversorManual(data.potenciaInversorManual);
          if (data.areaMinimaTotal) setAreaMinima(data.areaMinimaTotal);
          if (data.totalComImposto) setTotalComImposto(data.totalComImposto);
          if (data.geracaoMensal) setGeracaoMensal(data.geracaoMensal);
          if (data.geracaoMensalManual)
            setGeracaoMensalManual(data.geracaoMensalManual);
          if (data.geracaoDiaria) setGeracaoDiaria(data.geracaoDiaria);
          if (data.geracaoDiariaManual)
            setGeracaoDiariaManual(data.geracaoDiariaManual);
        }

        // 🔍 Busca o nome do cliente
        const clienteSnap = await getDoc(doc(db, `clientes/${clienteId}`));
        if (clienteSnap.exists()) {
          const clienteData = clienteSnap.data();
          setClienteNome(clienteData.nomeCliente || "---");
        }
      } catch (error) {
        console.error("Erro ao buscar projeto e cliente:", error);
      }
    };

    buscarProjeto();
  }, [clienteId, projetoId]);

  useEffect(() => {
    const carregarPrecificacao = async () => {
      if (!clienteId || !projetoId || !precificacaoId) return;
      setCarregandoDados(true);
      try {
        const docRef = doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
          precificacaoId
        );
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();

          // 🔥 Corrigido: usando !== undefined para aceitar 0 como valor válido
          setKitFotovoltaico(
            data.kitFotovoltaico !== undefined
              ? String(data.kitFotovoltaico)
              : "0"
          );
          setValorProjeto(
            data.valorProjeto !== undefined ? String(data.valorProjeto) : "62.7"
          );
          setValorPlacaAdvertencia(
            data.valorPlacaAdvertencia !== undefined
              ? String(data.valorPlacaAdvertencia)
              : "60"
          );
          setMargemLucroBruta(
            data.margemLucroBruta !== undefined
              ? String(data.margemLucroBruta)
              : "27"
          );
          setDesconto(
            data.desconto !== undefined ? String(data.desconto) : "0"
          );
          setPorcentagemComissao(
            data.porcentagemComissao !== undefined
              ? String(data.porcentagemComissao)
              : "3"
          );

          setValorEletricistaUnit(
            data.valorEletricistaUnit !== undefined
              ? String(data.valorEletricistaUnit)
              : "200"
          );
          setValorInfraUnit(
            data.valorInfraUnit !== undefined
              ? String(data.valorInfraUnit)
              : "62.5"
          );
          setValorComissaoUnit(
            data.valorComissaoUnit !== undefined
              ? String(data.valorComissaoUnit)
              : "50"
          );

          setEntrada(data.entrada !== undefined ? String(data.entrada) : "0");
          setJuros(data.juros !== undefined ? String(data.juros) : "0");
          setQtdParcelas(
            data.qtdParcelas !== undefined ? String(data.qtdParcelas) : "1"
          );

          setEditEletricista(data.editEletricista ?? false);
          setEditInfra(data.editInfra ?? false);
          setEstruturaProjeto(data.estruturaProjeto ?? "");
          setEditComissao(
            data.editComissao !== undefined ? data.editComissao : true
          );

          setParcelaSelecionada(data.parcelaSelecionada ?? null);
          setTipoInversor(data.tipoInversor ?? "");
          setQuantidadeInversor(
            data.quantidadeInversor !== undefined
              ? String(data.quantidadeInversor)
              : "0"
          );

          if (Array.isArray(data.opcoesFinanciamento)) {
            setOpcoesFinanciamento(data.opcoesFinanciamento);
          }
          if (data.potenciaInversorDigitada !== undefined) {
            setPotenciaInversorDigitada(data.potenciaInversorDigitada);
          }

          // 🔥 Atualiza dadosAntigos corretamente
          setDadosAntigos({
            kitFotovoltaico: String(data.kitFotovoltaico ?? "0"),
            valorProjeto: String(data.valorProjeto ?? "62.7"),
            valorPlacaAdvertencia: String(data.valorPlacaAdvertencia ?? "60"),
            margemLucroBruta: String(data.margemLucroBruta ?? "27"),
            desconto: String(data.desconto ?? "0"),
            porcentagemComissao: String(data.porcentagemComissao ?? "3"),
            valorEletricistaUnit: String(data.valorEletricistaUnit ?? "200"),
            valorInfraUnit: String(data.valorInfraUnit ?? "62.5"),
            valorComissaoUnit: String(data.valorComissaoUnit ?? "50"),
            entrada: String(data.entrada ?? "0"),
            juros: String(data.juros ?? "0"),
            qtdParcelas: String(data.qtdParcelas ?? "1"),
            parcelaSelecionada: data.parcelaSelecionada ?? null,
            quantidadePlacas: "0",
          });
        } else {
          // 🆕 Se não existe precificação, carrega valores padrão
          setKitFotovoltaico("0");
          setValorProjeto("62.7");
          setValorPlacaAdvertencia("60");
          setMargemLucroBruta("27");
          setDesconto("0");
          setPorcentagemComissao("3");
          setValorEletricistaUnit("200");
          setValorInfraUnit("62.5");
          setValorComissaoUnit("50");
          setEntrada("0");
          setJuros("0");
          setQtdParcelas("1");
          setQuantidadeInversor("0");
          setPotenciaInversorDigitada("0");
          setParcelaSelecionada(null);
          setEditEletricista(false);
          setEditInfra(false);
          setEditComissao(true);
          setEstruturaProjeto("");

          setDadosAntigos({
            kitFotovoltaico: "0",
            valorProjeto: "62.7",
            valorPlacaAdvertencia: "60",
            margemLucroBruta: "27",
            desconto: "0",
            porcentagemComissao: "3",
            valorEletricistaUnit: "200",
            valorInfraUnit: "62.5",
            valorComissaoUnit: "50",
            entrada: "0",
            juros: "0",
            qtdParcelas: "1",
            parcelaSelecionada: null,
            quantidadePlacas: "0",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar precificação:", error);
      } finally {
        setCarregandoDados(false);
      }
    };

    carregarPrecificacao();
  }, [clienteId, projetoId, precificacaoId]);

  const salvarPrecificacao = async () => {
    if (!clienteId || !projetoId || !precificacaoId) {
      console.error("IDs ausentes:", { clienteId, projetoId, precificacaoId });
      return;
    }

    // VALIDAÇÃO dos campos obrigatórios da precificação
    const camposObrigatorios: { nome: string; valor: any }[] = [
      // Valores principais
      { nome: "kitFotovoltaico", valor: kitFotovoltaico.trim() },
      { nome: "valorProjeto", valor: valorProjeto.trim() },
      { nome: "valorPlacaAdvertencia", valor: valorPlacaAdvertencia },
      { nome: "margemLucroBruta", valor: margemLucroBruta },
      { nome: "desconto", valor: desconto },
      { nome: "porcentagemComissao", valor: porcentagemComissao },

      // Flags de edição
      { nome: "editEletricista", valor: editEletricista },
      { nome: "editInfra", valor: editInfra },
      { nome: "editComissao", valor: editComissao },

      // Valores unitários
      { nome: "valorEletricistaUnit", valor: valorEletricistaUnit },
      { nome: "valorInfraUnit", valor: valorInfraUnit },
      { nome: "valorComissaoUnit", valor: valorComissaoUnit },

      // Financiamento
      { nome: "entrada", valor: entrada },
      { nome: "juros", valor: juros },
      { nome: "qtdParcelas", valor: qtdParcelas },
      { nome: "parcelaSelecionada", valor: parcelaSelecionada },

      // Dados técnicos
      { nome: "quantidadePlacas", valor: String(quantidadePlacas).trim() },

      // Valores calculados importantes
      { nome: "totalCusto", valor: totalCusto },
      { nome: "totalVenda", valor: totalVenda },
      { nome: "totalLucro", valor: totalLucro },
      {
        nome: "lucroFinalComDescontoEComissaoEImposto",
        valor: lucroFinalComDescontoEComissaoEImposto,
      },
      { nome: "faturamentoBrutoPorModulo", valor: faturamentoBrutoPorModulo },
      {
        nome: "faturamentoLiquidoPorModulo",
        valor: faturamentoLiquidoPorModulo,
      },
      { nome: "valorFinanciado", valor: valorFinanciado },
      { nome: "tipoInversor", valor: tipoInversor },
      { nome: "quantidadeInversor", valor: quantidadeInversor },
      { nome: "quantidadeInversor", valor: quantidadeInversor },
{ nome: "potenciaInversorDigitada", valor: String(potenciaInversorDigitada).trim() }, // 💡 Agora seguro

    ];

    const camposFaltando = camposObrigatorios.filter(
      (campo) =>
        campo.valor === undefined || campo.valor === "" || campo.valor === null
    );

    if (camposFaltando.length > 0) {
      const nomesFaltando = camposFaltando.map(
        (c) => nomesLegiveis[c.nome] || c.nome
      );

      alert(
        `Existem campos não preenchidos na precificação:\n- ${nomesFaltando.join(
          "\n- "
        )}`
      );
      return;
    }

    try {
      const financiamentoSelecionado =
        parcelaSelecionada === "avista"
          ? {
              parcelas: 1,
              taxa: 0,
              valorParcela: totalVenda,
              totalPago: totalVenda,
              jurosReais: 0,
              jurosPercentual: 0,
              valorFinalProjeto: totalVenda,
              lucroFinal: totalVenda - totalCusto - valorComissaoInterna,
            }
          : dadosParcelas.find((p) => p.parcelas === parcelaSelecionada);

      // Atualiza o documento pai com a data da última modificação
      await setDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}`
        ),
        {
          ultimaModificacao: Timestamp.now(),
        },
        { merge: true }
      );

      await setDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
          precificacaoId
        ),
        {
          // 🔢 Campos editáveis como string → convertidos para número
          kitFotovoltaico: parseDecimal(kitFotovoltaico || "0"),
          valorProjeto: parseDecimal(valorProjeto || "62.7"), // 🆕 Valor padrão 62.7
          valorPlacaAdvertencia: parseDecimal(valorPlacaAdvertencia || "60"), // 🆕 Valor padrão 60
          margemLucroBruta: parseDecimal(margemLucroBruta || "27"), // 🆕 Valor padrão 27%
          desconto: parseDecimal(desconto || "0"),
          porcentagemComissao: parseDecimal(porcentagemComissao || "3"), // 🆕 Valor padrão 3%
          entrada: parseDecimal(entrada || "0"),
          juros: parseDecimal(juros || "0"),

          qtdParcelas: parseInt(qtdParcelas || "1"),

          // 🔵 Valores de custo unitário com valor padrão
          valorEletricistaUnit: parseDecimal(valorEletricistaUnit || "200"), // 🆕 Valor padrão 200
          valorInfraUnit: parseDecimal(valorInfraUnit || "62.5"), // 🆕 Valor padrão 62.5
          valorComissaoUnit: parseDecimal(valorComissaoUnit || "50"), // 🆕 Valor padrão 50

          // ⚙️ Booleans e enums
          editEletricista,
          editInfra,
          editComissao,
          parcelaSelecionada,
          tipoInversor,

          // 🔧 Campos novos de inversor (digitados como string)
          quantidadeInversor: parseDecimal(quantidadeInversor || "0"),
          potenciaInversorDigitada: parseDecimal(
            potenciaInversorDigitada || "0"
          ),
          // 💰 Dados calculados (já estão como número)
          totalCusto,
          totalVenda,
          totalLucro,
          valorLucroKit,
          valorVendaKit,
          valorVendaEletricista,
          valorComissaoInterna,
          lucroFinalComDescontoEComissaoEImposto,
          faturamentoBrutoPorModulo,
          faturamentoLiquidoPorModulo,
          valorFinanciado,
          opcoesFinanciamento,
          ultimaModificacao: Timestamp.now(),
          editImposto, // ✅ Checkbox do imposto (ativo ou não)
          porcentagemImposto: parseDecimal(porcentagemImposto || "7"),
          estruturaProjeto,
          financiamentoSelecionado: financiamentoSelecionado || null,

          // 📊 Margem final
          margemLucroLiquida:
            totalVenda > 0
              ? Math.round(
                  (lucroFinalComDescontoEComissaoEImposto / totalVenda) * 100
                )
              : 0,
        },
        { merge: true }
      );

      // Salva alerta no localStorage
      localStorage.setItem("alertaHome", "Precificação salva com sucesso!");

      // Redireciona para tela inicial
      router.push(
        `/proposta/gerar-proposta?clienteId=${clienteId}&projetoId=${projetoId}&precificacaoId=${precificacaoId}`
      );
    } catch (error) {
      console.error("Erro ao salvar precificação:", error);
      alert("Erro ao salvar a precificação. Tente novamente.");
    }
  };

  // 🔥 Função de auto-save corrigida
  const autoSaveFirestore = async () => {
    if (!clienteId || !projetoId || !precificacaoId) return;

    // 🛡️ Proteção: Se ainda estiver carregando dados, não faz nada
    if (carregandoDados) {
      console.log(
        "⏩ Auto-save bloqueado porque ainda está carregando dados..."
      );
      return;
    }

    // 📦 Captura os dados atuais
    const dadosAtuais = {
      kitFotovoltaico,
      valorProjeto,
      valorPlacaAdvertencia,
      margemLucroBruta,
      desconto,
      porcentagemComissao,
      valorEletricistaUnit,
      valorInfraUnit,
      valorComissaoUnit,
      entrada,
      juros,
      qtdParcelas,
      parcelaSelecionada,
      estruturaProjeto,
      quantidadePlacas,
      editImposto, // ✅ adicionar aqui
      porcentagemImposto,
    };

    // 🔎 Compara os dados antigos com os atuais
    const mudouAlgo =
      JSON.stringify(dadosAntigos) !== JSON.stringify(dadosAtuais);

    if (!mudouAlgo) {
      console.log("⏩ Nada mudou, não salvou no Firestore.");
      return;
    }

    try {
      console.log("✅ Mudou, salvando no Firestore...");

      const financiamentoSelecionado =
        parcelaSelecionada === "avista"
          ? {
              parcelas: 1,
              taxa: 0,
              valorParcela: totalVenda,
              totalPago: totalVenda,
              jurosReais: 0,
              jurosPercentual: 0,
              valorFinalProjeto: totalVenda,
              lucroFinal: totalVenda - totalCusto - valorComissaoInterna,
            }
          : dadosParcelas.find((p) => p.parcelas === parcelaSelecionada);

      // Atualiza o documento pai com a data da última modificação
      await setDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}`
        ),
        {
          ultimaModificacao: Timestamp.now(),
        },
        { merge: true }
      );

      await setDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
          precificacaoId
        ),
        {
          // 🔢 Conversões numéricas corretas
          kitFotovoltaico: parseDecimal(kitFotovoltaico || "0"),
          valorProjeto: parseDecimal(valorProjeto || "62.7"),
          valorPlacaAdvertencia: parseDecimal(valorPlacaAdvertencia || "60"),
          margemLucroBruta: parseDecimal(margemLucroBruta || "27"),
          desconto: parseDecimal(desconto || "0"),
          porcentagemComissao: parseDecimal(porcentagemComissao || "3"),
          entrada: parseDecimal(entrada || "0"),
          juros: parseDecimal(juros || "0"),
          qtdParcelas: parseInt(qtdParcelas.toString() || "1"),
          valorEletricistaUnit: parseDecimal(valorEletricistaUnit || "200"),
          valorInfraUnit: parseDecimal(valorInfraUnit || "62.5"),
          valorComissaoUnit: parseDecimal(valorComissaoUnit || "50"),

          // ⚙️ Booleanos e enums
          editEletricista,
          editInfra,
          editComissao,
          parcelaSelecionada,
          tipoInversor,
          ultimaModificacao: Timestamp.now(),

          // 🔧 Campos adicionais
          quantidadeInversor: parseDecimal(quantidadeInversor || "0"),
          potenciaInversorDigitada: parseDecimal(
            potenciaInversorDigitada || "0"
          ),

          // 💰 Dados calculados
          totalCusto,
          totalVenda,
          totalLucro,
          valorLucroKit,
          valorVendaKit,
          valorVendaEletricista,
          valorComissaoInterna,
          lucroFinalComDescontoEComissaoEImposto,
          faturamentoBrutoPorModulo,
          faturamentoLiquidoPorModulo,
          valorFinanciado,
          opcoesFinanciamento,
          editImposto, // ✅ Checkbox do imposto (ativo ou não)
          porcentagemImposto: parseDecimal(porcentagemImposto || "7"), // ✅ Porcentagem editável
          estruturaProjeto,
          financiamentoSelecionado: financiamentoSelecionado || null,

          // 📊 Margem de lucro
          margemLucroLiquida:
            totalVenda > 0
              ? Math.round(
                  (lucroFinalComDescontoEComissaoEImposto / totalVenda) * 100
                )
              : 0,
        },
        { merge: true }
      );

      console.log("✅ Auto-save silencioso no Firestore concluído");
    } catch (error) {
      console.error("❌ Erro no auto-save:", error);
    }
  };

  useEffect(() => {
    if (!clienteId || !projetoId || !precificacaoId) return;

    // 🛡️ Não dispara auto-save se estiver carregando ainda
    if (carregandoDados) {
      console.log("⏩ Esperando terminar o carregamento...");
      return;
    }

    // 🔄 Limpa timeout antigo (se existia)
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // ⏱️ Aguardar 1s para salvar
    autoSaveTimeout.current = setTimeout(() => {
      autoSaveFirestore();
    }, 1000);

    // 🔄 Limpeza se desmontar ou atualizar muito rápido
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [
    carregandoDados, // 🔥 Adicionado para controlar corretamente
    kitFotovoltaico,
    valorProjeto,
    valorPlacaAdvertencia,
    margemLucroBruta,
    desconto,
    porcentagemComissao,
    editComissao,
    valorComissaoUnit,
    editEletricista,
    editInfra,
    valorEletricistaUnit,
    valorInfraUnit,
    entrada,
    juros,
    qtdParcelas,
    parcelaSelecionada,
    quantidadePlacas,
  ]);

  // RENDER DE INPUT PARA COMISSÃO SE ATIVO
  const renderComissaoRow = (valor: string) =>
    editComissao && (
      <tr>
        <td className="text-center">
          <input
            readOnly
            type="text"
            className="input input-sm input-bordered w-32 text-center bg-gray-200"
            value={valor}
          />
        </td>
      </tr>
    );

  return (
    <div className="p-6 mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center text-white">
        Precificação
      </h1>
      {/* 🔷 PAINEL DE RESUMO DO PROJETO (acima da precificação) */}
      <div className="bg-[#1a1a1a] p-4 rounded-xl mb-6 shadow-2xl border border-[#1a1a1a] text-sm text-white">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-center">
          <div className="mb-4">
            <p className="text-lg font-semibold text-purple-300">
              Cliente:{" "}
              <span className="text-white">{clienteNome || "---"}</span>
            </p>
            <p className="text-md text-purple-200">
              Projeto:{" "}
              <span className="text-white">{nomeProjeto || "---"}</span>
            </p>
          </div>
          <div>
            <span className="text-gray-400">Geração Mensal:</span>
            <br />
            <strong>
              {modo === "manual"
                ? geracaoMensalManual ?? "---"
                : geracaoMensal ?? "---"}{" "}
              kWh
            </strong>
          </div>
          <div>
            <span className="text-gray-400">Geração Diária:</span>
            <br />
            <strong>
              {modo === "manual"
                ? geracaoDiariaManual ?? "---"
                : geracaoDiaria ?? "---"}{" "}
              kWh
            </strong>
          </div>
          <div>
            <span className="text-gray-400">Qtd. Placas Usadas</span>
            <br />
            <strong>
              {modo === "manual"
                ? qtdPlacasManual ?? "---"
                : qtdPlacas ?? "---"}
            </strong>
          </div>
          <div>
            <span className="text-gray-400">Consumo Médio Mês:</span>
            <br />
            <strong>{consumoMedioMes ?? "---"} kWh</strong>
          </div>
          <div>
            <span className="text-gray-400">Consumo Médio Dia:</span>
            <br />
            <strong>{consumoMedioDia ?? "---"} kWh</strong>
          </div>
          <div>
            <span className="text-gray-400">Qtd. de Placas:</span>
            <br />
            <strong>
              {modo === "manual"
                ? qtdPlacasManual ?? "---"
                : qtdPlacas ?? "---"}
            </strong>
          </div>
          <div>
            <span className="text-gray-400">Potência da Placa</span>
            <br />
            <strong>{potenciaPlaca ?? "---"} kW</strong>
          </div>
          <div>
            <span className="text-gray-400">Potência Inversor:</span>
            <br />
            <strong>{potenciaInversorFinal ?? "---"} kW</strong>
          </div>
          <div>
            <span className="text-gray-400">Potência de Pico:</span>
            <br />
            <strong>{potenciaPicoFinal ?? "---"} kW</strong>
          </div>
          <div>
            <span className="text-gray-400">Área Mínima:</span>
            <br />
            <strong>{areaMinima ?? "---"} m²</strong>
          </div>
          <div>
            <span className="text-gray-400">Total c/ Imposto:</span>
            <br />
            <strong>R$ {totalComImposto?.toFixed(2) ?? "---"}</strong>
          </div>
        </div>
      </div>

      <div className="flex justify-between mb-6">
        {/* CARD DE AJUSTE DE VALORES */}
        <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full max-w-md border border-base-300">
          <h2 className="font-bold text-white text-lg mb-4 text-center gap-2">
            <span className="text-gray-400">
              <FontAwesomeIcon icon={faGear} />
            </span>{" "}
            Ajustes de Custos Variáveis
            <p className="text-gray-500 text-sm font-semibold">
              <FontAwesomeIcon icon={faBell} className="mr-2" />
              Selecione o checkbox para incluir a comissão por indicação e o
              imposto!!
            </p>
          </h2>

          <div className="flex flex-col gap-5">
            {/* COMISSÃO */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-sm text-white">
                <span className="font-semibold">Comissão (Indicação)</span>
                <span className="text-xs text-gray-400">
                  Valor padrão: R$ 50,00
                </span>
              </div>
              <input
                type="checkbox"
                className="checkbox"
                checked={editComissao}
                onChange={() => setEditComissao(!editComissao)}
              />
            </div>
            {editComissao && (
              <input
                type="text"
                className="input input-sm input-bordered w-full text-center"
                value={valorComissaoUnit}
                onChange={(e) =>
                  setValorComissaoUnit(sanitizeNumericInput(e.target.value))
                }
                placeholder="Informe valor por placa"
              />
            )}
          </div>
          {/* IMPOSTO SOBRE NOTA FISCAL */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex flex-col text-sm text-white">
              <span className="font-semibold">Imposto Nota Fiscal (%)</span>
              <span className="text-xs text-gray-400">Valor padrão: 7%</span>
            </div>
            <input
              type="checkbox"
              className="checkbox"
              checked={editImposto}
              onChange={() => setEditImposto(!editImposto)}
            />
          </div>
          {editImposto && (
            <input
              type="text"
              className="input input-sm input-bordered w-full text-center mt-2"
              value={porcentagemImposto}
              onChange={(e) =>
                setPorcentagemImposto(sanitizeNumericInput(e.target.value))
              }
              placeholder="Informe % de imposto"
            />
          )}
        </div>

        {/* TABELA DE RESUMO FINAL */}
        <div className="max-w-xl rounded-2xl overflow-hidden shadow-2xl">
          <h2 className="bg-base-100 text-white text-center font-bold py-2">
            RESUMO
          </h2>
          <table className="table w-full text-sm">
            <tbody>
              <tr>
                <td className="font-semibold px-4 py-2">Quantidade módulos</td>
                <td className="px-4 py-2 text-right">{placas ?? 0}</td>
              </tr>
              <tr>
                <td className="font-semibold px-4 py-2">
                  Margem de Lucro Bruta Kit Fotovoltaico %
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-24 text-right"
                    value={margemLucroBruta}
                    onChange={(e) =>
                      setMargemLucroBruta(sanitizeNumericInput(e.target.value))
                    }
                  />
                </td>
              </tr>
              <tr>
                <td className="font-semibold px-4 py-2">
                  Faturamento bruto por módulo
                </td>
                <td className="px-4 py-2 text-right">
                  R$ {faturamentoBrutoPorModulo.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="font-semibold px-4 py-2">
                  Faturamento líquido por módulo
                </td>
                <td className="px-4 py-2 text-right">
                  R$ {faturamentoLiquidoPorModulo.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="font-semibold px-4 py-2">Desconto</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-24 text-right"
                    value={desconto}
                    onChange={(e) =>
                      setDesconto(sanitizeNumericInput(e.target.value))
                    }
                  />
                </td>
              </tr>
              <tr className="bg-green-300 text-[#1a1a1a] font-semibold">
                <td className="px-4 py-2">Margem de Lucro Líquida</td>
                <td className="px-4 py-2 text-right">{margemLucroLiquida}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CARD DE CÁLCULO DE COMISSÃO INTERNA */}
        <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full max-w-md border border-base-300">
          <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2 justify-center">
            <span className="text-gray-400">
              <FontAwesomeIcon icon={faClipboard} />
            </span>{" "}
            Cálculo de Comissão Interna
          </h2>

          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr className="bg-base-100 text-white text-center">
                <th className="font-semibold">%</th>
                <th className="font-semibold">Valor do Projeto</th>
                <th className="font-semibold">Comissão</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-center">
                {/* Porcentagem editável */}
                <td>
                  <input
                    type="text"
                    className="input input-sm input-bordered w-20 text-center"
                    value={porcentagemComissao}
                    onChange={(e) =>
                      setPorcentagemComissao(
                        sanitizeNumericInput(e.target.value)
                      )
                    }
                  />
                </td>

                {/* Total do projeto (venda total) */}
                <td className="text-white">R$ {totalVenda.toFixed(2)}</td>

                {/* Comissão calculada */}
                <td className="text-white">
                  R$ {valorComissaoInterna.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex rounded-2xl shadow-2xl overflow-x-auto mt-6">
        {/* COLUNA: DESCRIÇÃO */}
        <table className="table w-full">
          <thead>
            <tr className="bg-base-100 text-white">
              <th className="text-center">Descrição</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr>
              <th>Kit Fotovoltaico</th>
            </tr>
            <tr>
              <th>Projeto</th>
            </tr>
            <tr>
              <th>Placa de advertência</th>
            </tr>
            <tr>
              <th>Eletricista / Instalador</th>
            </tr>
            <tr>
              <th>Infraestrutura</th>
            </tr>
            {editComissao && (
              <tr>
                <th>Comissão de Indicação</th>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-base-100 text-white">
              <th className="text-center">Total</th>
            </tr>
          </tfoot>
        </table>

        {/* COLUNA: VALOR DE CUSTO */}
        <table className="table w-full border-x border-base-300">
          <thead>
            <tr className="bg-orange-500 text-white text-sm">
              <th className="text-center">Valor Custo</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr>
              <td className="text-center">
                <input
                  type="text"
                  className="input input-sm input-bordered w-32 text-center"
                  placeholder="R$"
                  value={kitFotovoltaico}
                  onChange={(e) =>
                    setKitFotovoltaico(sanitizeNumericInput(e.target.value))
                  }
                />
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <input
                  type="text"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorProjeto}
                  onChange={(e) =>
                    setValorProjeto(sanitizeNumericInput(e.target.value))
                  }
                />
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <input
                  type="text"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorPlacaAdvertencia}
                  onChange={(e) =>
                    setValorPlacaAdvertencia(
                      sanitizeNumericInput(e.target.value)
                    )
                  }
                />
              </td>
            </tr>
            <tr>
              <td className="text-center flex justify-between">
                <p className="flex text-center justify-center items-center mr-5">
                  {placasUsadas} x
                </p>
                <input
                  type="text"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorEletricistaUnit}
                  onChange={(e) =>
                    setValorEletricistaUnit(
                      sanitizeNumericInput(e.target.value)
                    )
                  }
                  placeholder="R$"
                />
                <p className="flex text-center justify-center items-center">
                  = {lucroEletricista}
                </p>
              </td>
            </tr>
            <tr>
              <td className="text-center flex justify-between">
                <p className="flex text-center justify-center items-center mr-5">
                  {placasUsadas} x
                </p>
                <input
                  type="text"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorInfraUnit}
                  onChange={(e) =>
                    setValorInfraUnit(sanitizeNumericInput(e.target.value))
                  }
                  placeholder="R$"
                />
                <p className="flex text-center justify-center items-center">
                  = {custoInfra}
                </p>
              </td>
            </tr>
            {editComissao && (
              <tr>
                <td className="text-center">
                  <p>R$ {custoComissao.toFixed(2)}</p>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-orange-500 text-base font-semibold">
              <td className="text-center text-white">
                R$ {totalCusto.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* COLUNA: VALOR DE VENDA */}
        <table className="table w-full border-x border-base-300">
          <thead>
            <tr className="bg-green-500 text-white text-sm">
              <th className="text-center">Valor Venda</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr>
              <td className="text-center">
                <p>R$ {valorVendaKit.toFixed(2)}</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ {parseDecimal(valorProjeto || "0").toFixed(2)}</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>
                  R$ {parseDecimal(valorPlacaAdvertencia || "0").toFixed(2)}
                </p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ {valorVendaEletricista.toFixed(2)}</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ {custoInfra.toFixed(2)}</p>
              </td>
            </tr>
            {editComissao && (
              <tr>
                <td className="text-center">
                  <p>R$ {custoComissao.toFixed(2)}</p>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-green-500 text-base font-semibold">
              <td className="text-center text-white">
                R$ {totalVenda.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* COLUNA: LUCRO */}
        <table className="table w-full border-x border-base-300">
          <thead>
            <tr className="bg-blue-300 text-white text-sm">
              <th className="text-center">Lucro</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr>
              <td className="text-center">
                <p>R$ {valorLucroKit.toFixed(2)}</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ 0,00</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ 0,00</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>
                  R${" "}
                  {parseDecimal(lucroEletricista.toString() || "0").toFixed(2)}
                </p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ 0,00</p>
              </td>
            </tr>
            {editComissao && (
              <tr>
                <td className="text-center">
                  <p>R$ 0,00</p>
                </td>
              </tr>
            )}
            <tr className="bg-blue-300 text-base font-semibold h-10">
              <td className="text-center text-white">
                R$ {totalLucro.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
        <table className="table border-l border-base-300">
          <tfoot>
            <tr className="bg-yellow-200 text-base font-bold">
              <td className="text-center text-gray-800" colSpan={3}>
                <div>
                  Final (com dedução comissão):
                  <br />
                  R$ {lucroFinalComDescontoEComissaoEImposto.toFixed(2)}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap justify-center items-stretch gap-10 mt-10">
        {/* CARD: Financiamento WMB Capital */}
        <div className="w-[400px] h-full flex flex-col rounded-md overflow-hidden border border-gray-600 shadow-lg">
          <h2 className="text-md font-bold bg-black text-white py-2 text-center">
            Financiamento WMB Capital
          </h2>
          <table className="w-full text-sm text-white flex-grow">
            <tbody>
              <tr className="border-b border-gray-600">
                <td className="px-4 py-2 font-medium bg-zinc-800">
                  Valor do Projeto
                </td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  R$ {totalVenda.toFixed(2)}
                </td>
              </tr>
              <tr className="border-b border-gray-600">
                <td className="px-4 py-2 font-medium bg-zinc-800">Entrada</td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  <input
                    type="text"
                    value={entrada}
                    onChange={(e) =>
                      setEntrada(sanitizeNumericInput(e.target.value))
                    }
                    className="bg-transparent border border-gray-500 px-2 py-1 w-30 text-right rounded"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium bg-zinc-800">
                  Valor Financiado
                </td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  R$ {valorFinanciado.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CARD: Pagamento Fornecedor */}
        <div className="w-[400px] h-full flex flex-col rounded-md overflow-hidden border border-gray-600 shadow-lg">
          <h2 className="text-md font-bold bg-black text-white py-2 text-center">
            Pagamento Fornecedor
          </h2>
          <table className="w-full text-sm text-white flex-grow">
            <tbody>
              {/* Campo: Juros */}
              <tr className="border-b border-gray-600">
                <td className="px-4 py-2 font-medium bg-zinc-800">
                  Juros (R$)
                </td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  <input
                    type="text"
                    value={juros}
                    onChange={(e) =>
                      setJuros(sanitizeNumericInput(e.target.value))
                    }
                    className="bg-transparent border border-gray-500 px-2 py-1 w-24 text-right rounded"
                  />
                </td>
              </tr>

              {/* Campo: Qtd. Parcelas */}
              <tr className="border-b border-gray-600">
                <td className="px-4 py-2 font-medium bg-zinc-800">
                  Qtd. Parcelas
                </td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  <input
                    type="text"
                    value={qtdParcelas}
                    onChange={(e) =>
                      setQtdParcelas(sanitizeNumericInput(e.target.value))
                    }
                    className="bg-transparent border border-gray-500 px-2 py-1 w-24 text-right rounded"
                  />
                </td>
              </tr>

              {/* Valor da Parcela */}
              <tr className="border-b border-gray-600">
                <td className="px-4 py-2 font-medium bg-zinc-800">
                  Valor da Parcela
                </td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  R${" "}
                  {(
                    (parseDecimal(kitFotovoltaico || "0") +
                      parseDecimal(juros || "0")) /
                    parseDecimal(qtdParcelas || "1")
                  ).toFixed(2)}
                </td>
              </tr>

              {/* Total */}
              <tr>
                <td className="px-4 py-2 font-medium bg-zinc-800">Total</td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  R${" "}
                  {(
                    parseDecimal(kitFotovoltaico || "0") +
                    parseDecimal(juros || "0")
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-md border border-gray-600">
        <table className="table w-full text-sm text-white">
          <thead className="bg-yellow-600 text-black text-center">
            <tr>
              <th></th>
              <th>Nº de Parcelas</th>
              <th>Taxa de Juros ao Mês %</th>
              <th>Valor da Parcela</th>
              <th>Total Pago</th>
              <th>Juros (R$)</th>
              <th>Juros (%)</th>
              <th>Valor Final do Projeto</th>
              <th>Lucro Final com Financiamento</th>
              <th>Margem de Lucro</th>
            </tr>
          </thead>
          <tbody className="text-center">
            <tr
              className={`${
                parcelaSelecionada === "avista"
                  ? "bg-green-700 font-semibold"
                  : "odd:bg-zinc-800 even:bg-zinc-700"
              }`}
            >
              <td>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={parcelaSelecionada === "avista"}
                  onChange={() =>
                    setParcelaSelecionada(
                      parcelaSelecionada === "avista" ? null : "avista"
                    )
                  }
                />
              </td>
              <td>À Vista</td>
              <td>0%</td>
              <td>R$ {totalVenda.toFixed(2)}</td>
              <td>R$ {totalVenda.toFixed(2)}</td>
              <td>R$ 0,00</td>
              <td>0%</td>
              <td>R$ {totalVenda.toFixed(2)}</td>
              <td>
                R$ {(totalVenda - totalCusto - valorComissaoInterna).toFixed(2)}
              </td>
              <td>
                {/* ✅ Margem de Lucro = lucroFinal / valorFinal * 100 */}
                {totalVenda > 0
                  ? `${(
                      ((totalVenda - totalCusto - valorComissaoInterna) /
                        totalVenda) *
                      100
                    ).toFixed(0)}%`
                  : "0%"}
              </td>
            </tr>
            {dadosParcelas.map((item, index) => {
              const isSelecionado = parcelaSelecionada === item.parcelas;

              const margemDeLucro =
                item.valorFinalProjeto > 0
                  ? (item.lucroFinal / item.valorFinalProjeto) * 100
                  : 0;

              return (
                <tr
                  key={item.parcelas}
                  className={`text-white ${
                    isSelecionado
                      ? "bg-green-700 font-semibold"
                      : "odd:bg-zinc-800 even:bg-zinc-700"
                  }`}
                >
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={isSelecionado}
                      onChange={() =>
                        setParcelaSelecionada(
                          parcelaSelecionada === item.parcelas
                            ? null
                            : item.parcelas
                        )
                      }
                    />
                  </td>
                  <td>{item.parcelas}</td>

                  {/* Campo editável de taxa de juros */}
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      value={opcoesFinanciamento[index].taxa}
                      onChange={(e) =>
                        atualizarTaxa(index, parseDecimal(e.target.value) || 0)
                      }
                      className={`bg-transparent border border-gray-500 px-2 py-1 w-16 text-center rounded text-white ${
                        isSelecionado
                          ? "bg-green-700 font-semibold border-white"
                          : ""
                      }`}
                    />
                  </td>
                  <td>R$ {item.valorParcela.toFixed(2)}</td>
                  <td>R$ {item.totalPago.toFixed(2)}</td>
                  <td>R$ {item.jurosReais.toFixed(2)}</td>
                  <td>{item.jurosPercentual.toFixed(0)}%</td>
                  <td>R$ {item.valorFinalProjeto.toFixed(2)}</td>
                  <td>R$ {item.lucroFinal.toFixed(2)}</td>
                  <td>{margemDeLucro.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-20">
        {/* CARD: Tipo e Quantidade de Inversor */}
        <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full max-w-md border border-base-300 flex flex-col justify-self-center mt-10">
          <h2 className="font-bold text-white text-lg mb-1 text-center gap-2">
            <span className="text-yellow-400">
              <FontAwesomeIcon icon={faBolt} />
            </span>{" "}
            Inversor
          </h2>
          <p className="text-gray-500 text-sm font-semibold mb-2">
            <FontAwesomeIcon icon={faBell} className="mr-2" />
            Selecione o tipo do inversor e a quantidade para prosseguir
          </p>

          {/* Select do tipo de inversor */}
          <div className="mb-4 w-full flex items-center">
            <label className="block text-sm text-white mb-1 text-center w-44">
              Tipo de Inversor:
            </label>
            <select
              className="select select-bordered w-full"
              value={tipoInversor}
              onChange={(e) => setTipoInversor(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              <option value="Inversor">Inversor</option>
              <option value="Microinversor">Microinversor</option>
            </select>
          </div>

          {/* Input da quantidade */}
          <div className="w-full flex items-center">
            <label className="block text-sm text-white mb-1 mx-2">
              Quantidade:
            </label>

            <input
              type="text"
              className="input input-bordered w-20 text-center"
              value={quantidadeInversor}
              onChange={(e) =>
                setQuantidadeInversor(
                  sanitizeNumericInput(e.target.value.replace(",", "."))
                )
              }
              required
            />
          </div>
          <div className="w-full flex items-center">
            <label className="block text-sm text-white mb-1 mx-2">
              Potência do Inversor (kWp):{" "}
            </label>
            <input
              type="text"
              className="input input-sm input-bordered w-32 text-center"
              value={potenciaInversorDigitada}
              onChange={(e) =>
                setPotenciaInversorDigitada(
                  sanitizeNumericInput(e.target.value.replace(",", "."))
                )
              }
              placeholder="Ex: 4.5"
            />
          </div>
        </div>
        {/* CARD: Tipo de Estrutura do Projeto */}
        <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-2xl w-full max-w-md border border-base-300 flex flex-col justify-self-center mt-10">
          <h2 className="font-bold text-white text-lg mb-1 text-center gap-2">
            <span className="text-yellow-400">
              <FontAwesomeIcon icon={faBolt} />
            </span>{" "}
            Estrutura do Projeto
          </h2>

          <p className="text-gray-500 text-sm font-semibold mb-2">
            <FontAwesomeIcon icon={faBell} className="mr-2" />
            Selecione o tipo de estrutura
          </p>

          {/* Select do tipo de estrutura */}
          <div className="mb-4 w-full flex items-center">
            <label className="block text-sm text-white mb-1 text-center w-44">
              Estrutura:
            </label>
            <select
              className="select select-bordered w-full"
              value={estruturaProjeto}
              onChange={(e) => setEstruturaProjeto(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              <option value="Telhado Fibrocimento">Telhado Fibrocimento</option>
              <option value="Telhado Colonial">Telhado Colonial</option>
              <option value="Telhado Metal">Telhado Metal</option>
              <option value="Laje">Laje</option>
              <option value="Solo">Solo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-6 mt-20">
        <button
          type="button"
          onClick={() => router.push(`/precificacao`)}
          className="btn btn-outline w-40"
        >
          Voltar
        </button>

        <button
          onClick={salvarPrecificacao}
          type="button"
          className="btn w-40 bg-emerald-500 hover:bg-emerald-600 transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          <p className="text-white font-semibold">Salvar</p>
        </button>
      </div>
    </div>
  );
}
