"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faClipboard,
  faExclamation,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { nomesLegiveis } from "@/utils/nomesLegiveis";

export default function dadosPrecificacao() {
  // Captura os parâmetros da URL (clienteId e projetoId)
  const searchParams = useSearchParams();
  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  const router = useRouter();
  const precificacaoId = searchParams.get("precificacaoId");
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // 🔁 Importante: adicione no início do seu componente
  const [consumoMedioMes, setConsumoMedioMes] = useState<number | null>(null);
  const [consumoMedioDia, setConsumoMedioDia] = useState<number | null>(null);
  const [modo, setModo] = useState<string | null>(null);
  const [qtdPlacas, setQtdPlacas] = useState<number | null>(null);
  const [qtdPlacasManual, setQtdPlacasManual] = useState<number | null>(null);
  const [potenciaInversor, setPotenciaInversor] = useState<number | null>(null);
  const [potenciaInversorManual, setPotenciaInversorManual] = useState<
    number | null
  >(null);
  const [areaMinima, setAreaMinima] = useState<number | null>(null);
  const [totalComImposto, setTotalComImposto] = useState<number | null>(null);
  const [potenciaPlaca, setPotenciaPlaca] = useState<number | null>(null);
  const [potenciaPico, setPotenciaPico] = useState<number | null>(null);
  const [potenciaPicoManual, setPotenciaPicoManual] = useState<number | null>(
    null
  );
  const [geracaoMensal, setGeracaoMensal] = useState<number | null>(null);
  const [geracaoMensalManual, setGeracaoMensalManual] = useState<number | null>(
    null
  );
  const [geracaoDiaria, setGeracaoDiaria] = useState<number | null>(null);
  const [geracaoDiariaManual, setGeracaoDiariaManual] = useState<number | null>(
    null
  );

  // Dados vindos do banco e inputs editáveis
  const [quantidadePlacas, setQuantidadePlacas] = useState<number>(0);
  const [kitFotovoltaico, setKitFotovoltaico] = useState(""); // em string por causa do input de texto
  const [valorProjeto, setValorProjeto] = useState(62.57);
  const [valorPlacaAdvertencia, setValorPlacaAdvertencia] = useState(60.0);

  // Margem de lucro e desconto
  const [margemLucroBruta, setMargemLucroBruta] = useState(27); // valor padrão 27%
  const [desconto, setDesconto] = useState(0); // valor manual
  const [porcentagemComissao, setPorcentagemComissao] = useState(3); // padrão 3%

  const [editEletricista, setEditEletricista] = useState(false);
  const [editInfra, setEditInfra] = useState(false);
  const [editComissao, setEditComissao] = useState(true);
  const [entrada, setEntrada] = useState(0);

  // Valores por unidade (por placa)
  const [valorEletricistaUnit, setValorEletricistaUnit] = useState(200);
  const [valorInfraUnit, setValorInfraUnit] = useState(62.5);
  const [valorComissaoUnit, setValorComissaoUnit] = useState(50);

  // Estados necessários para o card
  const [juros, setJuros] = useState(0); // valor de juros (%)
  const [qtdParcelas, setQtdParcelas] = useState(1); // número de parcelas
  const [parcelaSelecionada, setParcelaSelecionada] = useState<
    number | "avista" | null
  >(0);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const custoInfra = quantidadePlacas * valorInfraUnit;
  const custoComissao = editComissao ? quantidadePlacas * valorComissaoUnit : 0;

  const [opcoesFinanciamento, setOpcoesFinanciamento] = useState([
    { parcelas: 12, taxa: 2.3 },
    { parcelas: 18, taxa: 2.5 },
    { parcelas: 24, taxa: 2.7 },
    { parcelas: 36, taxa: 2.9 },
    { parcelas: 48, taxa: 3.1 },
    { parcelas: 60, taxa: 3.3 },
    { parcelas: 72, taxa: 3.5 },
  ]);

  const placas = modo === "manual" ? qtdPlacasManual : qtdPlacas;
  const custoEletricista = (placas || 0) * valorEletricistaUnit;
  const valorVendaEletricista = custoEletricista * 2;
  const lucroEletricista = valorVendaEletricista - custoEletricista;

  const atualizarTaxa = (index: number, novaTaxa: number) => {
    const novaLista = [...opcoesFinanciamento];
    novaLista[index].taxa = novaTaxa;
    setOpcoesFinanciamento(novaLista);
  };

  const totalCusto =
    parseFloat(kitFotovoltaico || "0") +
    valorProjeto +
    valorPlacaAdvertencia +
    custoEletricista +
    custoInfra +
    (editComissao ? custoComissao : 0);

  // Valor de venda é calculado com margem sobre o kit + duplicação do eletricista + valores fixos
  const valorVendaKit =
    parseFloat(kitFotovoltaico || "0") +
    (margemLucroBruta / 100) * parseFloat(kitFotovoltaico || "0") -
    desconto;

  const valorLucroKit = valorVendaKit - parseFloat(kitFotovoltaico || "0");

  const totalVenda =
    valorVendaKit +
    valorProjeto +
    valorPlacaAdvertencia +
    valorVendaEletricista +
    custoInfra +
    (editComissao ? custoComissao : 0); // ✅ Adiciona comissão se estiver ativa

  const totalLucro = totalVenda - totalCusto - desconto;
  const valorComissaoInterna = (porcentagemComissao / 100) * totalVenda;
  const lucroFinalComDescontoEComissao = totalLucro - valorComissaoInterna;

  const placasUsadas =
    modo === "manual"
      ? qtdPlacasManual ?? qtdPlacas ?? 0
      : qtdPlacas ?? qtdPlacasManual ?? 0;

  const faturamentoBrutoPorModulo =
    placasUsadas > 0 ? totalVenda / placasUsadas : 0;

  const faturamentoLiquidoPorModulo =
    placasUsadas > 0 ? lucroFinalComDescontoEComissao / placasUsadas : 0;

  const valorFinanciado = totalVenda - entrada;
  const margemLucroLiquida =
    totalVenda > 0
      ? ((lucroFinalComDescontoEComissao / totalVenda) * 100).toFixed(0)
      : "0";

  const dadosParcelas = opcoesFinanciamento.map((opcao) => {
    const valorParcela =
      (valorFinanciado * (opcao.taxa / 100)) /
      (1 - Math.pow(1 + 0.02, -opcao.parcelas));

    const totalPago = Math.ceil(opcao.parcelas * valorParcela * 100) / 100;
    const jurosReais = totalPago - valorFinanciado;
    const jurosPercentual = (jurosReais / valorFinanciado) * 100;
    const valorFinalProjeto = totalPago + entrada;
    const lucroFinal = valorFinalProjeto - totalCusto - valorComissaoInterna;

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

  useEffect(() => {
    const buscarProjeto = async () => {
      if (!clienteId || !projetoId) return;

      const docRef = doc(db, `clientes/${clienteId}/projetos/${projetoId}`);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        // Já existia
        if (data.qtdPlacas) setQuantidadePlacas(data.qtdPlacas);

        // 👇 Adiciona os novos estados aqui
        if (data.consumoMedioMes) setConsumoMedioMes(data.consumoMedioMes);
        if (data.consumoMedioDia) setConsumoMedioDia(data.consumoMedioDia);
        if (data.modo) setModo(data.modo);
        if (data.qtdPlacas) setQtdPlacas(data.qtdPlacas);
        if (data.qtdPlacasManual) setQtdPlacasManual(data.qtdPlacasManual);
        if (data.potenciaPlaca) setPotenciaPlaca(data.potenciaPlaca);
        if (data.potenciaInversor) setPotenciaInversor(data.potenciaInversor);
        if (data.potenciaPico) setPotenciaPico(data.potenciaPico);
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
    };

    buscarProjeto();
  }, [clienteId, projetoId]);

  // BUSCAR DADOS DO FIRESTORE
  useEffect(() => {
    const buscarProjeto = async () => {
      if (!clienteId || !projetoId) return;
      const docRef = doc(db, `clientes/${clienteId}/projetos/${projetoId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.qtdPlacas) {
          setQuantidadePlacas(data.qtdPlacas);
        }
        
      }
    };
    buscarProjeto();
  }, [clienteId, projetoId]);

  useEffect(() => {
    const carregarPrecificacao = async () => {
      if (!clienteId || !projetoId || !precificacaoId) return;

      // Caminho correto para buscar os dados salvos
      const docRef = doc(
        db,
        `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
        precificacaoId
      );
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        // Agora sim, recuperando o kitFotovoltaico salvo corretamente
        setKitFotovoltaico(data.kitFotovoltaico || "");
        setValorProjeto(data.valorProjeto || 0);
        setValorPlacaAdvertencia(data.valorPlacaAdvertencia || 0);
        setMargemLucroBruta(data.margemLucroBruta || 0);
        setDesconto(data.desconto || 0);
        setPorcentagemComissao(data.porcentagemComissao || 0);
        setEditEletricista(data.editEletricista || false);
        setEditInfra(data.editInfra || false);
        setEditComissao(
          data.editComissao !== undefined ? data.editComissao : true
        );
        setValorEletricistaUnit(data.valorEletricistaUnit || 200);
        setValorInfraUnit(data.valorInfraUnit || 62.5);
        setValorComissaoUnit(data.valorComissaoUnit || 50);
        setEntrada(data.entrada || 0);
        setJuros(data.juros || 0);
        setQtdParcelas(data.qtdParcelas || 1);
        setParcelaSelecionada(data.parcelaSelecionada ?? null);
        if (Array.isArray(data.opcoesFinanciamento)) {
          setOpcoesFinanciamento(data.opcoesFinanciamento);
        }
      }
      setCarregandoDados(false);
    };

    carregarPrecificacao();
  }, [clienteId, projetoId, precificacaoId]); // ⬅ adicione o `precificacaoId` como dependência

  const salvarPrecificacao = async () => {
    if (!clienteId || !projetoId || !precificacaoId) {
      console.error("IDs ausentes:", { clienteId, projetoId, precificacaoId });
      return;
    }

    // VALIDAÇÃO dos campos obrigatórios da precificação
    const camposObrigatorios: { nome: string; valor: any }[] = [
      // Valores principais
      { nome: "kitFotovoltaico", valor: kitFotovoltaico },
      { nome: "valorProjeto", valor: valorProjeto },
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
      { nome: "quantidadePlacas", valor: quantidadePlacas },

      // Valores calculados importantes
      { nome: "totalCusto", valor: totalCusto },
      { nome: "totalVenda", valor: totalVenda },
      { nome: "totalLucro", valor: totalLucro },
      {
        nome: "lucroFinalComDescontoEComissao",
        valor: lucroFinalComDescontoEComissao,
      },
      { nome: "faturamentoBrutoPorModulo", valor: faturamentoBrutoPorModulo },
      {
        nome: "faturamentoLiquidoPorModulo",
        valor: faturamentoLiquidoPorModulo,
      },
      { nome: "valorFinanciado", valor: valorFinanciado },
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

      await setDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
          precificacaoId
        ),
        {
          kitFotovoltaico,
          valorProjeto,
          valorPlacaAdvertencia,
          margemLucroBruta,
          desconto,
          porcentagemComissao,
          editEletricista,
          editInfra,
          editComissao,
          valorEletricistaUnit,
          valorInfraUnit,
          valorComissaoUnit,
          entrada,
          juros,
          qtdParcelas,
          totalCusto,
          totalVenda,
          totalLucro,
          valorLucroKit,
          valorVendaKit,
          valorVendaEletricista,
          valorComissaoInterna,
          lucroFinalComDescontoEComissao,
          faturamentoBrutoPorModulo,
          faturamentoLiquidoPorModulo,
          valorFinanciado,
          parcelaSelecionada,
          opcoesFinanciamento,
          financiamentoSelecionado: financiamentoSelecionado || null,
          margemLucroLiquida:
            totalVenda > 0
              ? Math.round((lucroFinalComDescontoEComissao / totalVenda) * 100)
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

  // ✅ Função que salva no Firestore sem redirecionar ou alertar
  const autoSaveFirestore = async () => {
    if (!clienteId || !projetoId || !precificacaoId) return;

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

      await setDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
          precificacaoId
        ),
        {
          // DADOS MANUAIS
          kitFotovoltaico,
          valorProjeto,
          valorPlacaAdvertencia,
          margemLucroBruta,
          desconto,
          porcentagemComissao,
          editEletricista,
          editInfra,
          editComissao,
          valorEletricistaUnit,
          valorInfraUnit,
          valorComissaoUnit,
          entrada,
          juros,
          qtdParcelas,
          parcelaSelecionada,

          // DADOS CALCULADOS
          totalCusto,
          totalVenda,
          totalLucro,
          valorLucroKit,
          valorVendaKit,
          valorVendaEletricista,
          valorComissaoInterna,
          lucroFinalComDescontoEComissao,
          faturamentoBrutoPorModulo,
          faturamentoLiquidoPorModulo,
          valorFinanciado,
          financiamentoSelecionado: financiamentoSelecionado || null,
          margemLucroLiquida:
            totalVenda > 0
              ? Math.round((lucroFinalComDescontoEComissao / totalVenda) * 100)
              : 0,

          // DADOS DO PROJETO
          consumoMedioMes,
          consumoMedioDia,
          modo,
          qtdPlacas,
          qtdPlacasManual,
          potenciaPlaca,
          potenciaInversor,
          potenciaInversorManual,
          potenciaPico,
          potenciaPicoManual,
          areaMinimaTotal: areaMinima,
          totalComImposto,
          geracaoMensal,
          geracaoMensalManual,
          geracaoDiaria,
          geracaoDiariaManual,
          opcoesFinanciamento,
        },
        { merge: true }
      );

      console.log("✅ Auto-save silencioso no Firestore concluído");
    } catch (error) {
      console.error("❌ Erro no auto-save:", error);
    }
  };

  useEffect(() => {
    // ⚠️ Não executa o auto-save enquanto os dados estão sendo carregados
    if (carregandoDados || !clienteId || !projetoId || !precificacaoId) return;

    // 🔄 Limpa o timeout anterior (se o usuário ainda está digitando)
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // ⏱️ Aguarda 1s após a última mudança para salvar
    autoSaveTimeout.current = setTimeout(() => {
      autoSaveFirestore(); // ✅ Salva sem redirecionar
    }, 1000);

    // 🔄 Limpa o timeout se desmontar ou mudar muito rápido
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [
    carregandoDados,
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
            <strong>
              {modo === "manual"
                ? potenciaInversorManual ?? "---"
                : potenciaInversor ?? "---"}{" "}
              kW
            </strong>
          </div>
          <div>
            <span className="text-gray-400">Potência de Pico:</span>
            <br />
            <strong>
              {(modo === "manual"
                ? potenciaPicoManual ?? potenciaPico
                : potenciaPico ?? potenciaPicoManual) ?? "---"}{" "}
              kW
            </strong>
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
        <div className="bg-[#1a1a1a] p-5 rounded-2xl shadow-xl w-full max-w-md border border-base-300">
          <h2 className="font-bold text-white text-lg mb-4 text-center gap-2">
            <span className="text-gray-400">
              <FontAwesomeIcon icon={faGear} />
            </span>{" "}
            Ajustes de Custos Variáveis
            <p className="text-gray-500 text-sm font-semibold">
              <FontAwesomeIcon icon={faBell} className="mr-2" />
              Selecione o checkbox para incluir a comissão por indicação!!
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
                type="number"
                className="input input-sm input-bordered w-full text-center"
                value={valorComissaoUnit}
                onChange={(e) => setValorComissaoUnit(Number(e.target.value))}
                placeholder="Informe valor por placa"
              />
            )}
          </div>
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
                    type="number"
                    className="input input-sm input-bordered w-24 text-right"
                    value={margemLucroBruta}
                    onChange={(e) =>
                      setMargemLucroBruta(Number(e.target.value))
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
                    type="number"
                    className="input input-sm input-bordered w-24 text-right"
                    value={desconto}
                    onChange={(e) => setDesconto(Number(e.target.value))}
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
                    type="number"
                    className="input input-sm input-bordered w-20 text-center"
                    value={porcentagemComissao}
                    onChange={(e) =>
                      setPorcentagemComissao(Number(e.target.value))
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
                  onChange={(e) => setKitFotovoltaico(e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <input
                  type="number"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorProjeto}
                  onChange={(e) => setValorProjeto(parseFloat(e.target.value))}
                />
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <input
                  type="number"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorPlacaAdvertencia}
                  onChange={(e) =>
                    setValorPlacaAdvertencia(parseFloat(e.target.value))
                  }
                />
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <input
                  type="number"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorEletricistaUnit}
                  onChange={(e) =>
                    setValorEletricistaUnit(Number(e.target.value))
                  }
                  placeholder="R$"
                />
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <input
                  type="number"
                  className="input input-sm input-bordered w-32 text-center"
                  value={valorInfraUnit}
                  onChange={(e) => setValorInfraUnit(Number(e.target.value))}
                  placeholder="R$"
                />
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
                <p>R$ {valorProjeto.toFixed(2)}</p>
              </td>
            </tr>
            <tr>
              <td className="text-center">
                <p>R$ {valorPlacaAdvertencia.toFixed(2)}</p>
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
                <p>R$ {lucroEletricista.toFixed(2)}</p>
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
                  R$ {lucroFinalComDescontoEComissao.toFixed(2)}
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
                    type="number"
                    min={0}
                    step="100"
                    value={entrada}
                    onChange={(e) =>
                      setEntrada(parseFloat(e.target.value) || 0)
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
                    type="number"
                    step="0.01"
                    value={juros}
                    onChange={(e) => setJuros(parseFloat(e.target.value) || 0)}
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
                    type="number"
                    min={1}
                    value={qtdParcelas}
                    onChange={(e) =>
                      setQtdParcelas(parseInt(e.target.value) || 1)
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
                    (parseFloat(kitFotovoltaico || "0") + juros) /
                    (qtdParcelas || 1)
                  ).toFixed(2)}
                </td>
              </tr>

              {/* Total */}
              <tr>
                <td className="px-4 py-2 font-medium bg-zinc-800">Total</td>
                <td className="px-4 py-2 text-right bg-zinc-900">
                  R$ {(parseFloat(kitFotovoltaico || "0") + juros).toFixed(2)}
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
                        atualizarTaxa(index, parseFloat(e.target.value) || 0)
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
