// ✅ Componente: ResumoProjeto.tsx
// 🔹 Agora usa dadosOrcamento (orcamento da tela de dados-orcamento)
//    e pega inversor/estrutura direto do PROJETO.

import {
  faBolt,
  faMoneyBill,
  faPerson,
  faRulerCombined,
  faSolarPanel,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  cliente: any;
  projeto: any;
  dadosOrcamento?: any; // 🔹 antes era dadosPrecificacao
  variante?: "proposta" | "contrato";
}

export default function ResumoProjeto({
  cliente,
  projeto,
  dadosOrcamento,
  variante = "proposta",
}: Props) {
  // 🔹 Helper para montar texto da forma de pagamento com base no ORÇAMENTO
  const gerarFormaPagamento = (): string => {
    if (!dadosOrcamento) return "---";

    const parcelaSelecionada = dadosOrcamento.parcelaSelecionada;
    const financiamento = dadosOrcamento.financiamentoSelecionado;

    if (parcelaSelecionada === "avista") {
      return "Pagamento à vista";
    }

    if (!financiamento) return "---";

    const { parcelas, valorParcela, valorFinalProjeto } = financiamento;

    const format = (valor: number) =>
      valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

    return `${parcelas}x de ${format(valorParcela)} (Total: ${format(
      valorFinalProjeto
    )})`;
  };

  // 🔹 Cores por contexto (proposta x contrato)
  const tituloCor =
    variante === "proposta" ? "text-purple-400" : "text-orange-400";

  // 🔹 Consumos usando modo manual/recomendado
  const consumoMensal =
    projeto.modo === "manual"
      ? projeto.consumoMedioMesManual ?? projeto.consumoMedioMes
      : projeto.consumoMedioMes ?? projeto.consumoMedioMesManual;

  const consumoDiario =
    projeto.modo === "manual"
      ? projeto.consumoMedioDiaManual ?? projeto.consumoMedioDia
      : projeto.consumoMedioDia ?? projeto.consumoMedioDiaManual;

  const geracaoMensal =
    projeto.modo === "manual"
      ? projeto.geracaoMensalManual ?? projeto.geracaoMensal
      : projeto.geracaoMensal ?? projeto.geracaoMensalManual;

  const geracaoDiaria =
    projeto.modo === "manual"
      ? projeto.geracaoDiariaManual ?? projeto.geracaoDiaria
      : projeto.geracaoDiaria ?? projeto.geracaoDiariaManual;

  const potenciaPico =
    projeto.modo === "manual"
      ? projeto.potenciaPicoManual ?? projeto.potenciaPico
      : projeto.potenciaPico ?? projeto.potenciaPicoManual;

  const excedente =
    projeto.modo === "manual"
      ? projeto.excedenteManual ?? projeto.excedente
      : projeto.excedente ?? projeto.excedenteManual;

  const excedenteUnidade =
    projeto.modo === "manual"
      ? projeto.excedenteUnidadeManual ?? projeto.excedenteUnidade
      : projeto.excedenteUnidade ?? projeto.excedenteUnidadeManual;

  const potenciaMinInversor =
    projeto.modo === "manual"
      ? projeto.potenciaInversorManual ?? projeto.potenciaInversor
      : projeto.potenciaInversor ?? projeto.potenciaInversorManual;

  // 🔹 Valores financeiros principais vindos do ORÇAMENTO
  const financiamento = dadosOrcamento?.financiamentoSelecionado;
  const valorFinalProjeto: number | null =
    financiamento?.valorFinalProjeto ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 🔹 LADO ESQUERDO: Cliente, Consumo, Área */}
      <div className="bg-[#1a1a1a] rounded-xl shadow-2xl p-6 space-y-4">
        {/* 🧍 Dados do Cliente */}
        <h2
          className={`text-lg font-semibold ${tituloCor} mb-3 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faPerson}
            className="text-zinc-200 text-xl mr-2"
          />
          Dados do Cliente
        </h2>
        <p>
          <strong>Nome:</strong> {cliente?.nomeCliente ?? "---"}
        </p>
        <p>
          <strong>Telefone:</strong> {cliente?.telefone ?? "---"}
        </p>
        <p>
          <strong>Projeto:</strong> {projeto?.nomeProjeto || "Não informado"}
        </p>

        {/* ⚡ Consumo */}
        <h2
          className={`text-lg font-semibold ${tituloCor} mb-3 mt-4 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faBolt}
            className="text-zinc-200 text-xl mr-2"
          />
          Consumo
        </h2>
        <p>
          <strong>Consumo médio mensal:</strong>{" "}
          {consumoMensal ? `${consumoMensal} kWh` : "---"}
        </p>
        <p>
          <strong>Consumo médio diário:</strong>{" "}
          {consumoDiario ? `${consumoDiario} kWh` : "---"}
        </p>

        {/* 📐 Área mínima */}
        <h2
          className={`text-lg font-semibold ${tituloCor} mb-3 mt-4 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faRulerCombined}
            className="text-zinc-200 text-xl mr-2"
          />
          Área Mínima Requerida
        </h2>
        <p>
          <strong>Área mínima total:</strong>{" "}
          {projeto?.areaMinimaTotal
            ? `${projeto.areaMinimaTotal} m²`
            : "Não calculada"}
        </p>
        <p>
          <strong>Dimensão da placa:</strong>{" "}
          {projeto?.comprimento && projeto?.largura
            ? `${projeto.comprimento}m x ${projeto.largura}m`
            : "---"}
        </p>
      </div>

      {/* 🔹 LADO DIREITO: Sistema + Resumo Financeiro */}
      <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-6 space-y-4">
        {/* ☀ Sistema Solar */}
        <h2
          className={`text-lg font-semibold ${tituloCor} mb-3 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faSolarPanel}
            className="text-zinc-200 text-xl mr-2"
          />
          Sistema Solar
        </h2>
        <p>
          <strong>Modo:</strong>{" "}
          {projeto?.modo === "manual" ? "Manual" : "Recomendado"}
        </p>
        <p>
          <strong>Qtd. de placas:</strong>{" "}
          {projeto?.modo === "manual"
            ? projeto?.qtdPlacasManual ?? projeto?.qtdPlacas ?? "---"
            : projeto?.qtdPlacas ?? projeto?.qtdPlacasManual ?? "---"}
        </p>
        <p>
          <strong>Potência da placa:</strong>{" "}
          {projeto?.potenciaPlaca ? `${projeto.potenciaPlaca} W` : "---"}
        </p>
        <p>
          <strong>Geração mensal:</strong>{" "}
          {geracaoMensal ? `${geracaoMensal} kWh` : "---"}
        </p>
        <p>
          <strong>Geração diária:</strong>{" "}
          {geracaoDiaria ? `${geracaoDiaria} kWh` : "---"}
        </p>
        <p>
          <strong>Potência pico:</strong>{" "}
          {potenciaPico ? `${potenciaPico} kW` : "---"}
        </p>
        <p>
          <strong>Excedente:</strong>{" "}
          {typeof excedente === "number" ? `${excedente}%` : "---"}
        </p>
        <p>
          <strong>Excedente unidade:</strong>{" "}
          {typeof excedenteUnidade === "number"
            ? `${excedenteUnidade.toFixed(1)} kWh`
            : "---"}
        </p>
        <p>
          <strong>Potência mínima do inversor:</strong>{" "}
          {potenciaMinInversor ? `${potenciaMinInversor} kW` : "---"}
        </p>
        <p>
          <strong>Estrutura do projeto:</strong>{" "}
          {projeto?.estruturaProjeto ?? "---"}
        </p>

        {/* 💰 Resumo Financeiro - APENAS valor final do orçamento */}
        {dadosOrcamento && financiamento && (
          <div className="mt-4">
            <h2
              className={`text-lg font-semibold ${tituloCor} mb-3 border-b border-gray-600 pb-2`}
            >
              <FontAwesomeIcon
                icon={faMoneyBill}
                className="text-zinc-200 mr-2"
              />
              Resumo Financeiro
            </h2>

            <p>
              <strong>Valor final do projeto:</strong>{" "}
              {typeof valorFinalProjeto === "number"
                ? valorFinalProjeto.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "---"}
            </p>

            <p>
              <strong>Forma de pagamento:</strong> {gerarFormaPagamento()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
