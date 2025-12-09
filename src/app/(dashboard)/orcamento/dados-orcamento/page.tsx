"use client"; 
// 🔹 Indica que este componente roda no cliente (necessário para hooks, etc).

import { useEffect, useMemo, useState } from "react";
// 🔹 Hooks do React:
//    - useState: gerenciar estados locais.
//    - useEffect: carregar dados assíncronos quando a tela monta.
//    - useMemo: memoizar cálculos derivados (evitar recalcular à toa).

import { useSearchParams, useRouter } from "next/navigation";
// 🔹 Hooks do Next (App Router):
//    - useSearchParams: ler query string (clienteId, projetoId, etc.).
//    - useRouter: navegação programática (router.push).

import { db, auth } from "@/firebase/firebaseConfig";
// 🔹 Importa as instâncias configuradas do Firebase:
//    - db: Firestore.
//    - auth: Auth.

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
// 🔹 Funções do Firestore:
//    - collection: referência à coleção (ex.: "produtos").
//    - getDocs: busca todos documentos de uma coleção/query.
//    - doc: referência a um documento específico.
//    - getDoc: busca um único documento.
//    - updateDoc: atualiza um documento existente.
//    - Timestamp: tipo de data/hora do Firestore.

/** -------------------------------------------------------
 *  Tipos do domínio
 *  ------------------------------------------------------*/
type Produto = {
  id: string;
  nomeProduto: string;

  // 🔹 valor de venda à vista do kit (totalCusto da tela de produtos/novo)
  //    IMPORTANTE: esse valor já é o VALOR FINAL de tudo, não multiplica mais por placas.
  valorVendaUnitario: number;

  // 🔹 comissão interna máxima cadastrada no produto (em %)
  comissaoInternaMaxPercent: number;
};

type PlanoFinanciamento = {
  parcelas: number | "avista";
  taxa: number;
};

type LinhaCalculada = {
  parcelas: number | "avista";
  taxaMesPercent: number;
  valorParcela: number;
  totalPago: number;
  jurosReais: number;
  jurosPercentual: number;
  valorFinalProjeto: number;
  lucroFinal: number;
  margemLucroPercent: number;
};

export default function DadosOrcamentoPage() {
  const searchParams = useSearchParams();
  // 🔹 Hook para ler parâmetros da query string.

  const router = useRouter();
  // 🔹 Hook para navegação programática (push para proposta, etc.).

  const clienteId = searchParams.get("clienteId");
  const projetoId = searchParams.get("projetoId");
  const orcamentoId = searchParams.get("orcamentoId");
  // 🔹 IDs vindos pela URL. São necessários para buscar/salvar dados no Firestore.

  /** -------------------------------------------------------
   *  Estados principais
   *  ------------------------------------------------------*/
  const [kits, setKits] = useState<Produto[]>([]);
  // 🔹 Lista de kits (produtos) carregados da coleção "produtos".

  const [kitSelecionadoId, setKitSelecionadoId] = useState<string>("");
  // 🔹 ID do kit selecionado no select.

  const [loadingTela, setLoadingTela] = useState(true);
  // 🔹 Indica se a tela ainda está carregando dados iniciais.

  const [salvandoPlano, setSalvandoPlano] = useState(false);
  // 🔹 Indica se estamos no processo de salvar o orçamento/financiamento.

  const [parcelaSelecionada, setParcelaSelecionada] = useState<
    number | "avista" | null
  >(null);
  // 🔹 Qual opção de parcelamento está selecionada na tabela (ex.: 12, 24, "avista").

  const [opcoesFinanciamento, setOpcoesFinanciamento] =
    useState<PlanoFinanciamento[]>([
      // 🔹 Opções padrão de financiamento com parcelas/taxas.
      { parcelas: "avista", taxa: 0 },
      { parcelas: 12, taxa: 2.3 },
      { parcelas: 18, taxa: 2.5 },
      { parcelas: 24, taxa: 2.7 },
      { parcelas: 36, taxa: 2.9 },
      { parcelas: 48, taxa: 3.1 },
      { parcelas: 60, taxa: 3.3 },
      { parcelas: 72, taxa: 3.5 },
      { parcelas: 84, taxa: 3.7 },
      { parcelas: 96, taxa: 3.9 },
    ]);

  /** -------------------------------------------------------
   *  Comissão interna
   *  ------------------------------------------------------*/
  // 🔹 Valor de desconto interno digitado para ESTE orçamento (%).
  //    Não precisa ser igual ao máximo do produto, mas não pode passar dele.
  const [comissaoInternaPercent, setComissaoInternaPercent] = useState<
    number | null
  >(null);

  /** -------------------------------------------------------
   *  Utils
   *  ------------------------------------------------------*/
  const parseDecimal = (valor: any): number => {
    // 🔹 Converte qualquer coisa em número decimal seguro.
    if (valor === null || valor === undefined) return 0;
    return parseFloat(String(valor).replace(",", ".").trim()) || 0;
  };

  /** -------------------------------------------------------
   *  Kit selecionado (resumo)
   *  ------------------------------------------------------*/
  const kitResumo = useMemo(
    () => kits.find((k) => k.id === kitSelecionadoId) || null,
    // 🔹 Procura, na lista de kits, o kit com id == kitSelecionadoId.
    //    Se não achar, retorna null.
    [kitSelecionadoId, kits]
  );

  /** -------------------------------------------------------
   *  Estados derivados do PROJETO (quantidade de placas)
   *  ------------------------------------------------------*/
  const [qtdPlacas, setQtdPlacas] = useState<number | null>(null);
  // 🔹 Quantidade de placas do projeto (manual ou recomendado).
  //    NOTA: Agora NÃO entra mais no cálculo do valor final, é apenas informativo/contexto.

  const [modoProjeto, setModoProjeto] = useState<
    "manual" | "recomendado" | null
  >(null);
  // 🔹 Indica se a quantidade de placas veio de cálculo manual ou recomendado.

  /** -------------------------------------------------------
   *  1) Carregar: KITS + ORÇAMENTO + PROJETO
   *  ------------------------------------------------------*/
  useEffect(() => {
    const carregarTudo = async () => {
      // 🔹 Se faltar algum ID, não conseguimos carregar corretamente.
      if (!clienteId || !projetoId || !orcamentoId) {
        console.error("Faltam IDs na URL");
        setLoadingTela(false);
        return;
      }

      try {
        // 1.1) Buscar KITS (coleção "produtos")
        const snapKits = await getDocs(collection(db, "produtos"));
        const listaKits: Produto[] = [];

        snapKits.forEach((docSnap) => {
          const d = docSnap.data() as any;

          listaKits.push({
            id: docSnap.id,
            nomeProduto: d.nomeProduto ?? "Sem nome",

            // 🔹 valorVendaUnitario vem de "totalCusto" da tela de produtos/novo.
            //    Esse valor JÁ É o valor final do kit, não multiplicamos mais por placas.
            valorVendaUnitario: Number(d.totalCusto ?? 0),

            // 🔹 comissão interna máxima salva no Firestore.
            comissaoInternaMaxPercent: Number(d.comissaoInternaMaxima ?? 0),
          });
        });

        setKits(listaKits);

        // 1.2) Buscar ORÇAMENTO salvo
        const refOrc = doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/orcamentos/${orcamentoId}`
        );
        const snapOrc = await getDoc(refOrc);

        if (snapOrc.exists()) {
          const data = snapOrc.data() as any;

          // 🔹 Restaura kit selecionado, se salvo.
          if (data.kitSelecionado?.id) {
            setKitSelecionadoId(String(data.kitSelecionado.id));
          }

          // 🔹 Restaura parcela selecionada, se salvo.
          if (data.parcelaSelecionada !== undefined) {
            setParcelaSelecionada(data.parcelaSelecionada as any);
          }

          // 🔹 Restaura opções de financiamento salvas, se existirem.
          if (Array.isArray(data.opcoesFinanciamento)) {
            const restaurado: PlanoFinanciamento[] =
              data.opcoesFinanciamento.map((pf: any) => ({
                parcelas: pf.parcelas,
                taxa: Number(pf.taxa ?? 0),
              }));
            setOpcoesFinanciamento(restaurado);
          }

          // 🔹 Restaura comissão interna (formato novo).
          if (data.comissaoInterna?.valorPercent !== undefined) {
            setComissaoInternaPercent(
              Number(data.comissaoInterna.valorPercent)
            );
          } else if (data.comissaoInternaPercent !== undefined) {
            // 🔹 Fallback pro formato antigo.
            setComissaoInternaPercent(Number(data.comissaoInternaPercent));
          }
        }

        // 1.3) Buscar PROJETO (qtd de placas) — AGORA APENAS PARA CONTEXTO
        const refProj = doc(db, "clientes", clienteId, "projetos", projetoId);
        const snapProj = await getDoc(refProj);

        if (snapProj.exists()) {
          const p = snapProj.data() as any;
          const modo: "manual" | "recomendado" = p.modo || "recomendado";

          const quantidade =
            modo === "manual"
              ? Number(p.qtdPlacasManual ?? 0)
              : Number(p.qtdPlacas ?? 0);

          setModoProjeto(modo);
          // 🔹 qdtPlacas agora não entra mais no cálculo do valor final, mas mantemos
          //    para exibição e contexto de auditoria.
          setQtdPlacas(quantidade > 0 ? quantidade : null);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do orçamento:", err);
      } finally {
        setLoadingTela(false);
      }
    };

    carregarTudo();
  }, [clienteId, projetoId, orcamentoId]);
  // 🔹 Reexecuta se algum ID mudar (na prática, só na primeira montagem).

  /** -------------------------------------------------------
   *  Ajustar comissão quando troca de kit
   *  ------------------------------------------------------*/
  useEffect(() => {
    if (!kitResumo) return;

    const max = kitResumo.comissaoInternaMaxPercent ?? 0;

    setComissaoInternaPercent((prev) => {
      if (prev === null) {
        // 🔹 Se ainda não tinha comissão setada, usamos o máximo como default.
        return max > 0 ? max : 0;
      }
      // 🔹 Se o valor anterior era maior que o novo máximo, cortamos.
      return prev > max ? max : prev;
    });
  }, [kitResumo]);

  const handleChangeComissao = (valueStr: string) => {
    // 🔹 Manipula mudança da comissão interna (%), respeitando o máximo do kit.
    if (!kitResumo) return;

    const max = kitResumo.comissaoInternaMaxPercent ?? 0;
    let valor = parseDecimal(valueStr);

    if (valor < 0) valor = 0;
    if (valor > max) valor = max;

    setComissaoInternaPercent(valor);
  };

  /** -------------------------------------------------------
   *  3) Cálculos financeiros
   *      NOVO: base = valorVendaUnitario (kit já é valor final)
   *      e depois aplica DESCONTO da comissão
   *  ------------------------------------------------------*/

  // 🔹 Base sem comissão:
  //    AGORA NÃO MULTIPLICA MAIS POR qtdPlacas.
  //    O valor de venda do kit (valorVendaUnitario) já é o valor final de tudo.
  const totalBaseSemComissao = useMemo(() => {
    if (!kitResumo) return 0;
    return kitResumo.valorVendaUnitario || 0;
  }, [kitResumo]);

  // 🔹 Base com desconto da comissão interna (%).
  const totalBaseComDesconto = useMemo(() => {
    const base = totalBaseSemComissao;
    const perc = comissaoInternaPercent ?? 0;

    if (base <= 0) return 0;
    if (perc <= 0) return base;

    // 🔹 Aplica desconto percentual em cima da base.
    return base * (1 - perc / 100);
  }, [totalBaseSemComissao, comissaoInternaPercent]);

  // 🔹 Valor do desconto em reais (diferença entre sem e com comissão).
  const descontoComissaoValor = useMemo(
    () => totalBaseSemComissao - totalBaseComDesconto,
    [totalBaseSemComissao, totalBaseComDesconto]
  );

  const calcularLinha = (
    plano: PlanoFinanciamento,
    totalBase: number,
    lucroBase: number
  ): LinhaCalculada => {
    // 🔹 Calcula uma linha da tabela para uma opção de financiamento específica.

    // Caso "À vista"
    if (plano.parcelas === "avista") {
      const valorFinalProjeto = totalBase; // 🔹 à vista = base com desconto.
      const lucroFinal = lucroBase; // 🔹 lucro base (aqui está 0, juros só em financiado).
      const margemLucroPercent =
        valorFinalProjeto > 0
          ? (lucroFinal / valorFinalProjeto) * 100
          : 0;

      return {
        parcelas: "avista",
        taxaMesPercent: plano.taxa,
        valorParcela: totalBase, // 🔹 parcela única = valor total.
        totalPago: totalBase,
        jurosReais: 0,
        jurosPercentual: 0,
        valorFinalProjeto,
        lucroFinal,
        margemLucroPercent,
      };
    }

    // Caso financiado (Tabela Price)
    const n = Number(plano.parcelas); // 🔹 número de parcelas.
    const i = plano.taxa / 100; // 🔹 taxa de juros ao mês (decimal).
    const PV = totalBase; // 🔹 valor presente (base com desconto).

    const fator = Math.pow(1 + i, n);
    const valorParcela = PV * ((i * fator) / (fator - 1));
    const totalPago = valorParcela * n;
    const jurosReais = totalPago - PV;
    const jurosPercentual = PV > 0 ? (jurosReais / PV) * 100 : 0;

    const lucroFinal = lucroBase + jurosReais;
    const margemLucroPercent =
      totalPago > 0 ? (lucroFinal / totalPago) * 100 : 0;

    return {
      parcelas: plano.parcelas,
      taxaMesPercent: plano.taxa,
      valorParcela,
      totalPago,
      jurosReais,
      jurosPercentual,
      valorFinalProjeto: totalPago,
      lucroFinal,
      margemLucroPercent,
    };
  };

  // 🔹 Agora a tabela usa a BASE COM DESCONTO (já sem comissão).
  const dadosParcelas: LinhaCalculada[] = useMemo(() => {
    if (!kitResumo) return [];
    const totalBase = totalBaseComDesconto;
    const lucroBase = 0; // 🔹 Você definiu que o lucro base é 0 e os juros são o "lucro".
    return opcoesFinanciamento.map((plano) =>
      calcularLinha(plano, totalBase, lucroBase)
    );
  }, [opcoesFinanciamento, kitResumo, totalBaseComDesconto]);

  const atualizarTaxa = (index: number, novaTaxaPercent: number) => {
    // 🔹 Atualiza a taxa de juros de uma linha específica da tabela.
    setOpcoesFinanciamento((prev) =>
      prev.map((plano, i) =>
        i === index ? { ...plano, taxa: novaTaxaPercent } : plano
      )
    );
  };

  const linhaSelecionada = useMemo(() => {
    // 🔹 Acha, entre as linhas calculadas, aquela que corresponde à parcelaSelecionada.
    if (parcelaSelecionada === null) return null;

    return (
      dadosParcelas.find(
        (linha) => linha.parcelas === parcelaSelecionada
      ) || null
    );
  }, [parcelaSelecionada, dadosParcelas]);

  /** -------------------------------------------------------
   *  4) Salvar financiamento + kit + comissão e ir pra proposta
   *  ------------------------------------------------------*/
  const salvarFinanciamentoEIr = async () => {
  if (!clienteId || !projetoId || !orcamentoId) {
    alert("IDs ausentes na URL (clienteId / projetoId / orcamentoId).");
    return;
  }
  if (!kitResumo) {
    alert("Selecione um kit primeiro.");
    return;
  }
  if (!qtdPlacas) {
    alert("O projeto não possui quantidade de placas válida.");
    return;
  }
  if (!linhaSelecionada) {
    alert("Selecione uma opção de pagamento na tabela.");
    return;
  }

  try {
    setSalvandoPlano(true);

    const ref = doc(
      db,
      `clientes/${clienteId}/projetos/${projetoId}/orcamentos/${orcamentoId}`
    );

    const comissaoPercent = comissaoInternaPercent ?? 0;

    // 🔥🔥🔥 AQUI — ATUALIZA O ORÇAMENTO 🔥🔥🔥
    await updateDoc(ref, {
      kitSelecionado: {
        id: kitResumo.id,
        nomeProduto: kitResumo.nomeProduto,
        valorVendaUnitario: kitResumo.valorVendaUnitario,
        comissaoInternaMaxPercent: kitResumo.comissaoInternaMaxPercent ?? 0,
      },

      financiamentoSelecionado: {
        parcelas: linhaSelecionada.parcelas,
        taxaMesPercent: linhaSelecionada.taxaMesPercent,
        valorParcela: linhaSelecionada.valorParcela,
        totalPago: linhaSelecionada.totalPago,
        jurosReais: linhaSelecionada.jurosReais,
        jurosPercentual: linhaSelecionada.jurosPercentual,
        valorFinalProjeto: linhaSelecionada.valorFinalProjeto,
        lucroFinal: linhaSelecionada.lucroFinal,
        margemLucroPercent: linhaSelecionada.margemLucroPercent,
      },

      parcelaSelecionada: linhaSelecionada.parcelas,

      opcoesFinanciamento: opcoesFinanciamento.map((p) => ({
        parcelas: p.parcelas,
        taxa: p.taxa,
      })),

      comissaoInterna: {
        valorPercent: comissaoPercent,
        valorMaxPercent: kitResumo.comissaoInternaMaxPercent ?? 0,
        descontoReais: descontoComissaoValor,
      },

      contextoCalculo: {
        modoProjeto: modoProjeto ?? "recomendado",
        qtdPlacas: qtdPlacas ?? 0,
        valorUnitarioKit: kitResumo.valorVendaUnitario,
        totalBaseSemComissao,
        totalBaseComDesconto,
        descontoComissaoValor,
        totalBaseUsado: totalBaseComDesconto,
      },

      // 🔥🔥🔥 IMPORTANTE: STATUS DO ORÇAMENTO 🔥🔥🔥
      // Isso permite que a tela de projetos saiba se o projeto está finalizado ou não.
      status: "em_andamento", // mude para "finalizado" quando o fluxo terminar

      ultimaModificacao: Timestamp.now(),
      atualizadoPor: auth.currentUser?.uid || "sistema",
    });

    // 🔥🔥🔥 AQUI — ATUALIZA O DOCUMENTO DO PROJETO 🔥🔥🔥
    await updateDoc(
      doc(db, "clientes", clienteId, "projetos", projetoId),
      {
        ultimaModificacao: Timestamp.now(),
        atualizadoPor: auth.currentUser?.uid || "sistema",
      }
    );

    // 🔥 NAVEGA PARA A PROPOSTA
    router.push(
      `/proposta/gerar-proposta?clienteId=${clienteId}&projetoId=${projetoId}&orcamentoId=${orcamentoId}`
    );

  } catch (err) {
    console.error("Erro ao salvar financiamento:", err);
    alert("Erro ao salvar opção selecionada.");
  } finally {
    setSalvandoPlano(false);
  }
};


  /** -------------------------------------------------------
   *  5) Render
   *  ------------------------------------------------------*/
  if (loadingTela) {
    // 🔹 Enquanto está carregando, mostra apenas um "Carregando...".
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Carregando orçamento...
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-10 flex flex-col gap-10 max-w-7xl mx-auto">
      {/* ===================== SEÇÃO: Seleção do kit ===================== */}
      <section className="bg-base-200/20 border border-base-300 rounded-2xl shadow-2xl p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Orçamento • Selecionar Kit
        </h1>

        <div className="max-w-xl mx-auto mb-4 space-y-4">
          <div>
            <label className="block mb-2 font-semibold">Escolha um kit:</label>
            <select
              className="select select-bordered w-full bg-base-200 text-white"
              value={kitSelecionadoId}
              onChange={(e) => {
                setKitSelecionadoId(e.target.value);
                setParcelaSelecionada(null);
                // 🔹 Ao trocar o kit, limpamos a parcela selecionada
                //    para evitar ficar com parcela marcada de outro kit.
              }}
            >
              <option value="">Selecione um kit</option>
              {kits.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {kit.nomeProduto}
                </option>
              ))}
            </select>
          </div>

          {kitResumo && (
            <>
              {/* 🔹 Informação da quantidade de placas apenas como contexto. */}
              {qtdPlacas && (
                <p className="text-sm">
                  Quantidade de placas do projeto:{" "}
                  <span className="font-semibold">{qtdPlacas}</span>{" "}
                  {modoProjeto ? `(${modoProjeto})` : ""}
                </p>
              )}

              {/* 🔹 Valor de venda do kit (à vista), que AGORA já é o valor final de tudo. */}
              <p className="text-sm">
                Valor de venda do kit (à vista):{" "}
                <span className="font-semibold text-emerald-400">
                  R{"$ "}
                  {kitResumo.valorVendaUnitario
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </p>

              {/* Comissão interna */}
              <div className="mt-4 space-y-2">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Desconto Máximo (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={kitResumo.comissaoInternaMaxPercent ?? 0}
                      value={comissaoInternaPercent ?? ""}
                      onChange={(e) =>
                        handleChangeComissao(e.target.value)
                      }
                      className="input input-bordered bg-base-200 w-24 text-center"
                    />
                    <span className="text-xs text-gray-300">
                      Máximo permitido para este kit:{" "}
                      <span className="font-semibold">
                        {kitResumo.comissaoInternaMaxPercent ?? 0}%
                      </span>
                    </span>
                  </div>
                </div>

                {/* Resumo dos valores com/sem comissão */}
                <div className="text-xs space-y-1 mt-1">
                  <p>
                    Total do projeto sem Desconto:{" "}
                    <span className="font-semibold">
                      R{"$ "}
                      {totalBaseSemComissao
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </p>
                  <p>
                    Desconto:{" "}
                    <span className="font-semibold text-amber-300">
                      R{"$ "}
                      {descontoComissaoValor
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </p>
                  <p>
                    Total do projeto com Desconto (base da simulação):{" "}
                    <span className="font-semibold text-emerald-400">
                      R{"$ "}
                      {totalBaseComDesconto
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===================== SEÇÃO: Tabela de simulação ===================== */}
      {kitResumo && (
        <section className="bg-base-200/20 border border-gray-600 rounded-md shadow-2xl p-6">
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-600">
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
                  <th>Lucro Final (apenas juros)</th>
                  <th>Margem de Lucro</th>
                </tr>
              </thead>

              <tbody className="text-center">
                {dadosParcelas.map((linha, index) => {
                  const isSelecionado =
                    parcelaSelecionada === linha.parcelas;
                  const isAvista = linha.parcelas === "avista";

                  return (
                    <tr
                      key={String(linha.parcelas)}
                      className={
                        isSelecionado
                          ? "bg-green-700 font-semibold"
                          : "odd:bg-zinc-800 even:bg-zinc-700"
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={isSelecionado}
                          onChange={() =>
                            setParcelaSelecionada(
                              isSelecionado ? null : linha.parcelas
                            )
                          }
                        />
                      </td>

                      <td>{isAvista ? "À Vista" : `${linha.parcelas}`}</td>

                      <td>
                        {isAvista ? (
                          <>0%</>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            value={opcoesFinanciamento[index].taxa}
                            onChange={(e) =>
                              atualizarTaxa(
                                index,
                                parseDecimal(e.target.value) || 0
                              )
                            }
                            className={`bg-transparent border border-gray-500 px-2 py-1 w-16 text-center rounded text-white ${
                              isSelecionado
                                ? "bg-green-700 font-semibold border-white"
                                : ""
                            }`}
                          />
                        )}
                      </td>

                      <td>
                        R{"$ "}
                        {linha.valorParcela
                          .toFixed(2)
                          .replace(".", ",")}
                      </td>
                      <td>
                        R{"$ "}
                        {linha.totalPago.toFixed(2).replace(".", ",")}
                      </td>
                      <td>
                        R{"$ "}
                        {linha.jurosReais
                          .toFixed(2)
                          .replace(".", ",")}
                      </td>
                      <td>{linha.jurosPercentual.toFixed(0)}%</td>
                      <td>
                        R{"$ "}
                        {linha.valorFinalProjeto
                          .toFixed(2)
                          .replace(".", ",")}
                      </td>
                      <td className="font-semibold text-emerald-400">
                        R{"$ "}
                        {linha.lucroFinal.toFixed(2).replace(".", ",")}
                      </td>
                      <td>{linha.margemLucroPercent.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center mt-8">
            <button
              className="btn bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 shadow-xl disabled:opacity-50"
              disabled={salvandoPlano}
              onClick={salvarFinanciamentoEIr}
            >
              {salvandoPlano
                ? "Salvando..."
                : "Salvar e ir para Proposta Comercial"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
