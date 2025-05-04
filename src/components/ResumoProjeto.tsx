// ✅ Componente: ResumoProjeto.tsx
import {
  faBolt,
  faMoneyBill,
  faPerson,
  faRulerCombined,
  faSackDollar,
  faSolarPanel,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

interface Props {
  cliente: any;
  projeto: any;
  dadosPrecificacao: any;
  variante?: "proposta" | "contrato";
}

export default function ResumoProjeto({
  cliente,
  projeto,
  dadosPrecificacao,
  variante = "proposta",
}: Props) {
  const gerarFormaPagamento = (
    parcelaSelecionada: string,
    entrada?: number,
    financiamentoSelecionado?: {
      parcelas: number;
      valorParcela: number;
      totalPago: number;
      valorFinalProjeto: number;
    }
  ): string => {
    if (parcelaSelecionada === "avista") return "Pagamento à vista";
    if (!financiamentoSelecionado) return "---";

    const { parcelas, valorParcela, totalPago, valorFinalProjeto } =
      financiamentoSelecionado;

    const format = (valor: number) =>
      valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    let texto = "";
    if (entrada && entrada > 0) texto += `Entrada de ${format(entrada)} + `;
    texto += `${parcelas}x de ${format(valorParcela)} = ${format(totalPago)}\n`;
    texto += `Total do Projeto: ${format(valorFinalProjeto)}`;

    return texto;
  };

  // 🎨 Cores por contexto
  const tituloCor =
    variante === "proposta" ? "text-purple-400" : "text-orange-400";

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-[#1a1a1a] rounded-xl shadow-2xl p-6 space-y-2">
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
          <strong>Nome:</strong> {cliente.nomeCliente}
        </p>
        <p>
          <strong>Telefone:</strong> {cliente.telefone}
        </p>
        <p>
          <strong>Projeto:</strong> {projeto.nomeProjeto || "Não informado"}
        </p>

        <h2
          className={`text-lg font-semibold ${tituloCor} mb-3 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faBolt}
            className="text-zinc-200 text-xl mr-2"
          />
          Consumo
        </h2>
        <p>
          <strong>Consumo médio mensal:</strong> {projeto.consumoMedioMes} kWh
        </p>
        <p>
          <strong>Consumo médio diário:</strong> {projeto.consumoMedioDia} kWh
        </p>

        <h2
          className={`text-lg font-semibold ${tituloCor} mb-3 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faRulerCombined}
            className="text-zinc-200 text-xl mr-2"
          />
          Área Mínima Requerida
        </h2>
        <p>
          <strong>Área mínima total:</strong> {projeto.areaMinimaTotal} m²
        </p>
        <p>
          <strong>Dimensão da placa:</strong> {projeto.comprimento}m x{" "}
          {projeto.largura}m
        </p>

        <h2
          className={`text-lg font-semibold ${tituloCor} my-3 border-b border-gray-600 pb-2`}
        >
          <FontAwesomeIcon
            icon={faSackDollar}
            className="text-zinc-200 text-xl mr-2"
          />
          Quanto vou pagar?
        </h2>
        <p>
          <strong>Total com imposto:</strong> R${" "}
          {projeto.totalComImposto.toFixed(2)}
        </p>
        <p>
          <strong>Total sem imposto:</strong> R${" "}
          {projeto.totalSemImposto.toFixed(2)}
        </p>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl shadow-xl p-6 space-y-2">
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
          {projeto.modo === "manual" ? "Manual" : "Recomendado"}
        </p>
        <p>
  <strong>Qtd. de placas:</strong>{" "}
  {projeto.modo === "manual"
    ? projeto.qtdPlacasManual ?? projeto.qtdPlacas ?? "---"
    : projeto.qtdPlacas ?? projeto.qtdPlacasManual ?? "---"}
</p>
        <p>
          <strong>Potência da placa:</strong> {projeto.potenciaPlaca} W
        </p>
        <p>
          <strong>Geração mensal:</strong>{" "}
          {projeto.modo === "manual"
            ? projeto.geracaoMensalManual ?? "---"
            : projeto.geracaoMensal ?? "---"}{" "}
          kWh
        </p>
        <p>
          <strong>Geração diária:</strong>{" "}
          {projeto.modo === "manual"
            ? projeto.geracaoDiariaManual ?? "---"
            : projeto.geracaoDiaria ?? "---"}{" "}
          kWh
        </p>
        <p>
  <strong>Potência pico:</strong>{" "}
  {projeto.modo === "manual"
    ? projeto.potenciaPicoManual ?? "---"
    : projeto.potenciaPico ?? "---"}{" "}
  kW
</p>
<p>
  <strong>Excedente:</strong>{" "}
  {projeto.modo === "manual"
    ? projeto.excedenteManual ?? projeto.excedente ?? "---"
    : projeto.excedente ?? "---"}
  %
</p>
        <p>
  <strong>Potência mínima do inversor:</strong>{" "}
  {projeto.modo === "manual"
    ? projeto.potenciaInversorManual ?? "---"
    : projeto.potenciaInversor ?? "---"}{" "}
  kW
</p>

        <p>
          <strong>Excedente Unidade:</strong>{" "}
          {projeto.modo === "manual"
            ? projeto.excedenteUnidadeManual?.toFixed(1)
            : projeto.excedenteUnidade?.toFixed(1)}{" "}
          kWh
        </p>

        {dadosPrecificacao && (
          <div>
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
              <strong>Valor do Kit Fotovoltaico:</strong> R$
              {Number(dadosPrecificacao.kitFotovoltaico ?? 0).toFixed(2)}
            </p>

            <p>
              <strong>Forma de Pagamento:</strong>{" "}
              {gerarFormaPagamento(
                dadosPrecificacao.parcelaSelecionada,
                dadosPrecificacao.entrada,
                dadosPrecificacao.financiamentoSelecionado
              )}
            </p>
            {dadosPrecificacao.financiamentoSelecionado && (
              <>
                <p>
                  <strong>Entrada:</strong> R${" "}
                  {dadosPrecificacao.entrada?.toFixed(2) ?? "0,00"}
                </p>
                <p>
                  <strong>Parcelas:</strong>{" "}
                  {dadosPrecificacao.financiamentoSelecionado.parcelas}x de R${" "}
                  {dadosPrecificacao.financiamentoSelecionado.valorParcela.toFixed(
                    2
                  )}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
