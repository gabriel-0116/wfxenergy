"use client";
// ✅ Esta página é Client Component porque usa hooks (useState/useEffect/useMemo),
// ✅ usa navegação (useRouter) e depende de interações do usuário no browser.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
// 🔹 Fragment: agrupa múltiplas <tr> sem criar div extra
// 🔹 useEffect: buscar dados ao montar
// 🔹 useMemo: evitar recalcular filtro/ordenação em toda renderização
// 🔹 useRef: cache em memória (não causa re-render)
// 🔹 useState: estados locais da página

import { useRouter } from "next/navigation";
// 🔹 Hook de navegação do Next.js (App Router)

import {
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
// 🔹 collectionGroup: busca “global” em todas subcoleções com mesmo nome ("projetos")
// 🔹 getDocs: lê os documentos de uma query
// 🔹 orderBy/limit/query: monta a query (ordenação/limite)
// 🔹 doc: cria referência de documento para deletar ou buscar
// 🔹 getDoc: lê 1 documento específico (cliente) quando precisar
// 🔹 deleteDoc: apaga o projeto

import { db } from "@/firebase/firebaseConfig";
// 🔹 Instância do Firestore

import { format } from "date-fns";
// 🔹 Formata datas

import { ptBR } from "date-fns/locale/pt-BR";
// 🔹 Locale pt-BR do date-fns

import { useAlert } from "@/context/AlertContext";
// 🔹 Alertas globais (success/error)

import { useConfirm } from "@/context/ConfirmContext";
// 🔹 Confirmação modal (sim/não)

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// 🔹 Renderizador FontAwesome

import {
  faCalendarAlt,
  faFolderOpen,
  faPhone,
  faSearch,
  faUser,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
// 🔹 Ícones usados na UI

// =========================================================
// TIPOS
// =========================================================

type StatusProjeto = "emAndamento" | "finalizado";
// ✅ Union literal → evita virar string genérica e protege o TS

type Projeto = {
  id: string; // 🔹 id do doc do projeto

  nomeProjeto: string; // 🔹 nome exibido na UI
  criadoEm: Date; // 🔹 data de criação convertida para Date
  ultimaModificacao?: Date; // 🔹 data da última alteração (para ordenação)

  consumoMedioMes?: number;
  consumoMedioDia?: number;

  qtdPlacas?: number;
  qtdPlacasManual?: number;

  potenciaPico?: number;
  potenciaPicoManual?: number;

  modo?: string;

  areaMinimaTotal?: number;
  totalComImposto?: number;

  potenciaPlaca?: string;

  status?: StatusProjeto; // ✅ vem do campo statusProjeto do documento do projeto

  geracaoMensal?: number;
  geracaoDiaria?: number;
};

type ClienteComProjetos = {
  id: string; // 🔹 id do doc do cliente
  nomeCliente: string; // 🔹 nome do cliente
  telefone: string; // 🔹 telefone do cliente

  projetos: Projeto[]; // 🔹 projetos do cliente

  statusCliente: "ativo" | "inativo"; // 🔹 ativo se tiver algum projeto não finalizado
};

// =========================================================
// HELPERS
// =========================================================

function toDateSafe(value: any, fallback: Date = new Date()): Date {
  // ✅ Converte Timestamp/Date/undefined → Date de forma segura.
  // 🔹 Se value for null/undefined: retorna fallback
  if (!value) return fallback;

  // 🔹 Se já for Date, retorna direto
  if (value instanceof Date) return value;

  // 🔹 Se for Timestamp do Firestore (tem .toDate), converte
  if (typeof value?.toDate === "function") return value.toDate();

  // 🔹 Se cair aqui, é um tipo inesperado → fallback
  return fallback;
}

export default function ProjetoPage() {
  const router = useRouter();
  // 🔹 navegação

  const { showAlert } = useAlert();
  // 🔹 alertas globais

  const { confirm } = useConfirm();
  // 🔹 confirmação global

  const [clientesComProjetos, setClientesComProjetos] = useState<ClienteComProjetos[]>([]);
  // 🔹 lista principal da tela (clientes + projetos)

  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  // 🔹 controla qual cliente está expandido na tabela

  const [filtro, setFiltro] = useState("");
  // 🔹 texto do input de busca

  const [tipoOrdenacao, setTipoOrdenacao] = useState<
    "modificacao_recente" | "modificacao_antiga" | "nome_az" | "nome_za"
  >("modificacao_recente");
  // 🔹 tipo de ordenação do select

  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  // 🔹 filtro do status do cliente

  const [loadingListagem, setLoadingListagem] = useState(false);
  // 🔹 loading para não parecer travado ao abrir a página

  const clienteDocCacheRef = useRef<Map<string, any>>(new Map());
  // ✅ Cache em memória de documentos de cliente:
  // 🔹 evita chamar getDoc do mesmo cliente repetidas vezes

  const handleVerProjeto = (clienteId: string, projetoId: string) => {
    // 🔹 navega para o fluxo do projeto
    router.push(`/projeto/novoprojeto/consumo?clienteId=${clienteId}&projetoId=${projetoId}`);
  };

  const toggleCliente = (clienteId: string) => {
    // 🔹 abre/fecha o cliente clicado
    setClienteAberto((prev) => (prev === clienteId ? null : clienteId));
  };

  // =========================================================
  // ✅ NOVO FETCH RÁPIDO (collectionGroup)
  // =========================================================
  //
  // ❌ Antes: clientes (1) + projetos por cliente (N) = N+1
  // ✅ Agora: projetos (1 query) + clientes faltantes (pontual com cache)
  //
  // ⚠️ Se o Firestore pedir índice (orderBy ultimaModificacao), crie o índice no console.
  // =========================================================

  useEffect(() => {
    const buscarDados = async () => {
      try {
        setLoadingListagem(true);
        // 🔹 ativa loading

        // 1) Busca TODOS os projetos de TODOS os clientes de uma vez
        const projetosQ = query(
          collectionGroup(db, "projetos"),
          orderBy("ultimaModificacao", "desc"),
          limit(1000)
          // 🔹 limite para não baixar “o mundo”
          // 🔹 ajuste se você tiver mais projetos (depois você pagina)
        );

        const projetosSnap = await getDocs(projetosQ);
        // 🔹 lê projetos

        // 2) Normaliza projetos em uma lista plana (com clienteId extraído do path)
        const projetosFlat = projetosSnap.docs
          .map((projDoc) => {
            const p = projDoc.data() as any;
            // 🔹 dados do projeto

            const projetoId = projDoc.id;
            // 🔹 id do projeto

            // ✅ clienteId vem do path:
            // /clientes/{clienteId}/projetos/{projetoId}
            const clienteId = projDoc.ref.parent.parent?.id ?? "";
            // 🔹 parent = "projetos"
            // 🔹 parent.parent = doc do cliente
            // 🔹 id desse doc = clienteId

            if (!clienteId) return null;
            // 🔹 se por algum motivo não conseguiu derivar o clienteId, ignora

            const statusProjetoRaw = String(p.statusProjeto || "").toLowerCase();
            // 🔹 pega statusProjeto e normaliza

            const status: StatusProjeto =
              statusProjetoRaw === "finalizado" ? "finalizado" : "emAndamento";
            // 🔹 se não for "finalizado", assume "emAndamento"

            const criadoEm = toDateSafe(p.criadoEm);
            // 🔹 converte criadoEm para Date (com fallback)

            const ultimaModificacao = toDateSafe(p.ultimaModificacao, criadoEm);
            // 🔹 converte ultimaModificacao para Date, se faltar usa criadoEm

            const projetoObj: Projeto = {
              id: projetoId,
              nomeProjeto: p.nomeProjeto || "Sem nome",
              criadoEm,
              ultimaModificacao,

              consumoMedioMes: p.consumoMedioMes,
              consumoMedioDia: p.consumoMedioDia,
              qtdPlacas: p.qtdPlacas,
              qtdPlacasManual: p.qtdPlacasManual,
              potenciaPico: p.potenciaPico,
              potenciaPicoManual: p.potenciaPicoManual,
              modo: p.modo,
              areaMinimaTotal: p.areaMinimaTotal,
              totalComImposto: p.totalComImposto,
              potenciaPlaca: p.potenciaPlaca,
              geracaoMensal: p.geracaoMensal,
              geracaoDiaria: p.geracaoDiaria,

              status,
            };
            // 🔹 monta objeto final do projeto (tipo Projeto)

            return { clienteId, projeto: projetoObj };
            // 🔹 retorna também o clienteId para agrupar
          })
          .filter((x): x is { clienteId: string; projeto: Projeto } => x !== null);
        // 🔹 remove null e garante tipo

        // 3) Descobre quais clientes precisam ser carregados (nome/telefone)
        const missingClienteIds = new Set<string>();
        // 🔹 set para evitar duplicar ids

        for (const item of projetosFlat) {
          if (!clienteDocCacheRef.current.has(item.clienteId)) {
            missingClienteIds.add(item.clienteId);
          }
        }
        // 🔹 só buscamos clientes que não estão no cache

        // 4) Busca clientes faltantes em paralelo (rápido)
        await Promise.all(
          Array.from(missingClienteIds).map(async (clienteId) => {
            const snap = await getDoc(doc(db, "clientes", clienteId));
            // 🔹 lê doc do cliente

            if (snap.exists()) {
              clienteDocCacheRef.current.set(clienteId, snap.data());
              // 🔹 salva no cache
            } else {
              clienteDocCacheRef.current.set(clienteId, null);
              // 🔹 marca como null para não ficar tentando sempre
            }
          })
        );

        // 5) Agrupa projetos por clienteId e monta estrutura da UI
        const mapCliente = new Map<string, ClienteComProjetos>();
        // ✅ Map tipado: evita TypeScript “widen” e te protege

        for (const item of projetosFlat) {
          const { clienteId, projeto } = item;

          const clienteData = clienteDocCacheRef.current.get(clienteId) as any | null;
          // 🔹 pega dados do cliente do cache

          const nomeCliente = clienteData?.nomeCliente || "Sem nome";
          // 🔹 fallback de nome

          const telefone = clienteData?.telefone || "Sem telefone";
          // 🔹 fallback de telefone

          if (!mapCliente.has(clienteId)) {
            mapCliente.set(clienteId, {
              id: clienteId,
              nomeCliente,
              telefone,
              projetos: [projeto],
              statusCliente: "ativo",
              // 🔹 placeholder; recalculamos logo depois com base nos projetos
            });
          } else {
            mapCliente.get(clienteId)!.projetos.push(projeto);
            // 🔹 adiciona projeto no cliente existente
          }
        }

        // 6) Calcula statusCliente (ativo/inativo) com base nos projetos
        const resultado: ClienteComProjetos[] = Array.from(mapCliente.values()).map((c) => {
          const clienteAtivo = c.projetos.some((p) => p.status !== "finalizado");
          // 🔹 ativo se tiver pelo menos 1 projeto não finalizado

          return {
            ...c,
            statusCliente: clienteAtivo ? "ativo" : "inativo",
          };
          // 🔹 retorna objeto final do cliente
        });

        setClientesComProjetos(resultado);
        // 🔹 atualiza estado final (renderiza tabela)
      } catch (e) {
        console.error("Erro ao carregar /projeto:", e);
        // 🔹 loga erro no console

        setClientesComProjetos([]);
        // 🔹 evita UI quebrada

        showAlert("Erro ao carregar projetos. Verifique o console.", "error");
        // 🔹 feedback pro usuário
      } finally {
        setLoadingListagem(false);
        // 🔹 desliga loading
      }
    };

    buscarDados();
    // 🔹 roda ao montar
  }, [showAlert]);

  // =========================================================
  // FILTROS E ORDENAÇÃO (useMemo para desempenho)
  // =========================================================

  const clientesFiltrados = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    // 🔹 normaliza filtro

    return clientesComProjetos.filter((cliente) => {
      const nome = (cliente.nomeCliente || "").toLowerCase();
      const tel = (cliente.telefone || "").toLowerCase();

      const correspondeBusca = !f || nome.includes(f) || tel.includes(f);
      // 🔹 filtro por nome ou telefone (igual antes)

      const correspondeStatus =
        filtroStatus === "todos" || cliente.statusCliente === filtroStatus;
      // 🔹 filtro por status

      return correspondeBusca && correspondeStatus;
    });
  }, [clientesComProjetos, filtro, filtroStatus]);

  const clientesOrdenados = useMemo(() => {
    const arr = [...clientesFiltrados];
    // 🔹 copia array para não mutar original

    arr.sort((a, b) => {
      if (tipoOrdenacao === "modificacao_recente") {
        const dataA = Math.max(...a.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0));
        const dataB = Math.max(...b.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0));
        return dataB - dataA;
      }

      if (tipoOrdenacao === "modificacao_antiga") {
        const dataA = Math.max(...a.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0));
        const dataB = Math.max(...b.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0));
        return dataA - dataB;
      }

      if (tipoOrdenacao === "nome_az") return a.nomeCliente.localeCompare(b.nomeCliente);
      if (tipoOrdenacao === "nome_za") return b.nomeCliente.localeCompare(a.nomeCliente);

      return 0;
    });

    return arr;
  }, [clientesFiltrados, tipoOrdenacao]);

  // =========================================================
  // EXCLUIR PROJETO (mantém, só melhora update local)
  // =========================================================

  const handleExcluirProjeto = async (clienteId: string, projetoId: string) => {
    const confirmado = await confirm("Deseja realmente excluir este projeto?");
    // 🔹 pede confirmação ao usuário

    if (!confirmado) return;
    // 🔹 se cancelar, para aqui

    try {
      await deleteDoc(doc(db, "clientes", clienteId, "projetos", projetoId));
      // 🔹 apaga projeto no Firestore

      showAlert("Projeto excluído com sucesso!", "success");
      // 🔹 alerta sucesso

      setClientesComProjetos((prev) => {
        // 🔹 remove do estado local imediatamente (UI responde na hora)
        return prev
          .map((cliente) => {
            if (cliente.id !== clienteId) return cliente;

            const novosProjetos = cliente.projetos.filter((p) => p.id !== projetoId);
            // 🔹 remove projeto do array

            if (novosProjetos.length === 0) return null;
            // 🔹 se ficou sem projetos, remove o cliente da lista

            return {
              ...cliente,
              projetos: novosProjetos,
              statusCliente: novosProjetos.some((p) => p.status !== "finalizado")
                ? "ativo"
                : "inativo",
              // 🔹 recalcula statusCliente após exclusão
            };
          })
          .filter((c): c is ClienteComProjetos => c !== null);
        // 🔹 remove nulls e mantém tipagem
      });
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
      // 🔹 loga erro

      showAlert("Erro ao excluir projeto!", "error");
      // 🔹 alerta erro
    }
  };

  // =========================================================
  // UI (mantida igual a sua)
  // =========================================================

  return (
    <section className="p-10 bg-[#212325] text-white min-h-screen">
      <div className="flex justify-center mb-10">
        <div className="card bg-base-100 shadow-2xl border border-base-300 rounded-2xl p-8 flex flex-col items-center text-center transition-transform hover:scale-[1.02]">
          <h2 className="text-xl font-semibold mb-6">Gostaria de Iniciar um novo Projeto ?</h2>
          <button
            onClick={() => router.push("/projeto/novoprojeto")}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-800 hover:to-indigo-700 transition-all duration-300 shadow-md text-white font-semibold"
          >
            <FontAwesomeIcon icon={faUserPlus} />
            Iniciar Projeto
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center w-96">
          <button className="btn btn-square rounded-r-none">
            <FontAwesomeIcon icon={faSearch} />
          </button>
          <input
            type="text"
            placeholder="Pesquisar cliente ou projeto..."
            className="input input-bordered rounded-l-none w-full"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value.toLowerCase())}
          />
        </div>

        <div className="flex gap-6">
          <div>
            <label className="text-white font-medium mr-2">Status:</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="select select-bordered bg-gray-800 text-white"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>

          <div className="">
            <label className="text-white font-medium mr-2 flex items-center w-32">
              Ordenar por:
            </label>
            <select
              value={tipoOrdenacao}
              onChange={(e) => setTipoOrdenacao(e.target.value as any)}
              className="select select-bordered bg-gray-800 text-white"
            >
              <option value="modificacao_recente">Mais recentes primeiro</option>
              <option value="modificacao_antiga">Mais antigos primeiro</option>
              <option value="nome_az">Nome A → Z</option>
              <option value="nome_za">Nome Z → A</option>
            </select>
          </div>
        </div>
      </div>

      {/* ✅ Feedback simples de loading */}
      {loadingListagem && <p className="text-sm text-gray-300 mb-3">Carregando projetos...</p>}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="text-gray-100 text-[1rem] bg-[#1a1a1a]">
              <th className="p-4">
                <span>
                  <FontAwesomeIcon icon={faUser} className="mr-2 text-sky-700" />
                </span>
                Nome do Cliente
              </th>
              <th className="p-4">
                <span>
                  <FontAwesomeIcon icon={faPhone} className="mr-2 text-red-500" />
                </span>{" "}
                Telefone
              </th>
              <th className="p-4">Última Modificação</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {clientesOrdenados.map((cliente) => (
              <Fragment key={cliente.id}>
                <tr className="hover:bg-base-200 cursor-pointer" onClick={() => toggleCliente(cliente.id)}>
                  <td className="p-4 text-white font-medium">{cliente.nomeCliente}</td>
                  <td className="p-4 text-gray-300">{cliente.telefone}</td>
                  <td className="p-4">
                    {format(
                      Math.max(
                        ...cliente.projetos.map(
                          (p) => p.ultimaModificacao?.getTime?.() || p.criadoEm.getTime()
                        )
                      ),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`badge ${
                        cliente.statusCliente === "ativo" ? "badge-success" : "badge-error"
                      }`}
                    >
                      {cliente.statusCliente === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>

                {clienteAberto === cliente.id &&
                  cliente.projetos.map((proj) => (
                    <tr key={proj.id}>
                      <td colSpan={4} className="p-2">
                        <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 mb-2">
                              <p className="font-semibold text-md flex items-center gap-2">
                                Status:{" "}
                                <span
                                  className={`badge ${
                                    proj.status === "finalizado"
                                      ? "badge-success"
                                      : "badge-warning text-black"
                                  }`}
                                >
                                  {proj.status === "finalizado" ? "Finalizado" : "Em Andamento"}
                                </span>
                              </p>

                              <p className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon icon={faFolderOpen} className="text-blue-400" />
                                Projeto: <span className="font-normal">{proj.nomeProjeto}</span>
                              </p>

                              <p className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-400" />
                                Data de Criação:{" "}
                                <span className="font-normal">
                                  {format(proj.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </p>

                              <p className="font-semibold text-md flex items-center gap-2">
                                🕒 Última modificação:
                                <span className="font-normal">
                                  {format(proj.ultimaModificacao ?? proj.criadoEm, "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </p>

                              <div>
                                <span className="font-bold text-white">Consumo:</span>{" "}
                                {proj.consumoMedioMes ?? "-"} kWh/mês{" "}
                                {proj.consumoMedioDia ? `| ${proj.consumoMedioDia} kWh/dia` : ""}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-300">
                              <div>
                                <span className="font-bold text-white">Kit Fotovoltaico:</span>{" "}
                                {proj.modo === "manual"
                                  ? `${proj.qtdPlacasManual || "-"} placas | ${
                                      proj.potenciaPicoManual || "-"
                                    } kWp | ${proj.potenciaPlaca || "-"} W`
                                  : `${proj.qtdPlacas || "-"} placas | ${
                                      proj.potenciaPico || "-"
                                    } kWp | ${proj.potenciaPlaca || "-"} W`}
                              </div>

                              {proj.geracaoMensal && (
                                <div>
                                  <span className="font-bold text-white">Geração Mensal:</span>{" "}
                                  {proj.geracaoMensal.toFixed(2)} kWh
                                </div>
                              )}

                              {proj.geracaoDiaria && (
                                <div>
                                  <span className="font-bold text-white">Geração Diária:</span>{" "}
                                  {proj.geracaoDiaria.toFixed(2)} kWh
                                </div>
                              )}

                              {proj.areaMinimaTotal && (
                                <div>
                                  <span className="font-bold text-white">Área Mínima:</span>{" "}
                                  {proj.areaMinimaTotal.toFixed(2)} m²
                                </div>
                              )}

                              {proj.totalComImposto && (
                                <div>
                                  <span className="font-bold text-white">Estimativa:</span>{" "}
                                  R$ {proj.totalComImposto.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleVerProjeto(cliente.id, proj.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xl transition duration-300"
                          >
                            Ver Projeto
                          </button>

                          <button
                            onClick={() => handleExcluirProjeto(cliente.id, proj.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
