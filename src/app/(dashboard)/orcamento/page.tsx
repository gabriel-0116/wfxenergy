"use client";

/**
 * /orcamento/page.tsx
 * - Listagem rápida via collectionGroup("orcamentos")
 * - Agrupa por clienteId
 * - Fallback robusto: se faltar nome/telefone/nomeProjeto OU estiver "Sem nome", busca doc do cliente/projeto
 * - Extrai clienteId/projetoId do PATH (mais confiável)
 */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/context/ConfirmContext";

import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db, auth } from "@/firebase/firebaseConfig";

import {
  faSearch,
  faUser,
  faPhone,
  faFolderOpen,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IMaskInput } from "react-imask";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

// =========================================================
// Tipos
// =========================================================

type StatusCliente = "ativo" | "inativo";

type ClienteMini = {
  id: string;
  nomeCliente: string;
  telefone: string;
};

type OrcamentoItem = {
  clienteId: string;
  projetoId: string;
  orcamentoId: string;

  nomeProjeto: string;
  criadoEm: Date;
  ultimaModificacao: Date;

  status: string;
};

type ClienteComOrcamentos = {
  id: string;
  nomeCliente: string;
  telefone: string;
  projetos: OrcamentoItem[];
  statusCliente: StatusCliente;
};

// =========================================================
// Helpers
// =========================================================

function toDateSafe(value: any, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  return fallback;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

function normStr(v: unknown): string {
  return String(v ?? "").trim();
}

function isMissingName(v: unknown): boolean {
  const s = normStr(v).toLowerCase();
  return !s || s === "sem nome";
}

function isMissingPhone(v: unknown): boolean {
  const s = normStr(v).toLowerCase();
  return !s || s === "sem telefone";
}

// Extrai IDs do path:
// /clientes/{clienteId}/projetos/{projetoId}/orcamentos/{orcamentoId}
function extractIdsFromPath(path: string): { clienteId: string; projetoId: string } {
  const m = path.match(/clientes\/([^/]+)\/projetos\/([^/]+)\/orcamentos\/([^/]+)/);
  return {
    clienteId: m?.[1] ?? "",
    projetoId: m?.[2] ?? "",
  };
}

// =========================================================
// Página
// =========================================================

export default function OrcamentoPage() {
  const router = useRouter();
  const { confirm } = useConfirm();

  // =========================
  // Form (novo orçamento)
  // =========================

  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");

  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [clientes, setClientes] = useState<ClienteMini[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [clienteExiste, setClienteExiste] = useState<boolean | null>(null);
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState("");

  const [projetosDoCliente, setProjetosDoCliente] = useState<
    { id: string; nomeProjeto: string; criadoEm: Timestamp }[]
  >([]);

  const [projetoSelecionado, setProjetoSelecionado] = useState("");

  // =========================
  // Listagem
  // =========================

  const [clientesComOrcamento, setClientesComOrcamento] = useState<ClienteComOrcamentos[]>([]);
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  const [tipoOrdenacao, setTipoOrdenacao] = useState<
    "modificacao_recente" | "modificacao_antiga" | "nome_az" | "nome_za"
  >("modificacao_recente");

  // =========================
  // Loadings
  // =========================

  const [loadingAutocomplete, setLoadingAutocomplete] = useState(false);
  const [loadingClienteProjetos, setLoadingClienteProjetos] = useState(false);
  const [loadingListagem, setLoadingListagem] = useState(false);

  // =========================
  // Caches
  // =========================

  const clientesCacheRef = useRef<ClienteMini[] | null>(null);
  const clienteDocCacheRef = useRef<Map<string, any | null>>(new Map());
  const projetoDocCacheRef = useRef<Map<string, any | null>>(new Map());

  const toggleCliente = (id: string) => {
    setClienteAberto((prev) => (prev === id ? null : id));
  };

  // =========================================================
  // 1) Autocomplete
  // =========================================================

  const nomeClienteDebounced = useDebouncedValue(nomeCliente, 250);

  useEffect(() => {
    const run = async () => {
      if (nomeClienteDebounced.trim().length < 1) {
        setSugestoes([]);
        setClientes([]);
        return;
      }

      try {
        if (clientesCacheRef.current) {
          const filtrados = clientesCacheRef.current.filter((c) =>
            c.nomeCliente.toLowerCase().includes(nomeClienteDebounced.toLowerCase())
          );
          setClientes(filtrados);
          setSugestoes(filtrados.map((c) => c.nomeCliente));
          return;
        }

        setLoadingAutocomplete(true);
        const snap = await getDocs(collection(db, "clientes"));

        const todos: ClienteMini[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            nomeCliente: data.nomeCliente || "Sem nome",
            telefone: data.telefone || "",
          };
        });

        clientesCacheRef.current = todos;

        const filtrados = todos.filter((c) =>
          c.nomeCliente.toLowerCase().includes(nomeClienteDebounced.toLowerCase())
        );

        setClientes(filtrados);
        setSugestoes(filtrados.map((c) => c.nomeCliente));
      } catch (e) {
        console.error("Erro ao carregar clientes (autocomplete):", e);
        setSugestoes([]);
        setClientes([]);
      } finally {
        setLoadingAutocomplete(false);
      }
    };

    run();
  }, [nomeClienteDebounced]);

  const handleSelecionarSugestao = (nome: string) => {
    const cliente = clientes.find((c) => c.nomeCliente === nome);
    if (!cliente) return;

    setNomeCliente(cliente.nomeCliente);
    setTelefone(cliente.telefone);

    setSugestoes([]);
    setMostrarSugestoes(false);
  };

  // =========================================================
  // 2) Verificar cliente + carregar projetos
  // =========================================================

  const telefoneDebounced = useDebouncedValue(telefone, 250);

  useEffect(() => {
    const verificarCliente = async () => {
      const nomeOk = nomeClienteDebounced.trim().length >= 2;
      const telefoneOk = telefoneDebounced.trim().length >= 14;

      if (!nomeOk || !telefoneOk) {
        setClienteExiste(null);
        setProjetosDoCliente([]);
        setClienteIdSelecionado("");
        return;
      }

      try {
        setLoadingClienteProjetos(true);

        const q = query(
          collection(db, "clientes"),
          where("nomeCliente", "==", nomeClienteDebounced.trim()),
          where("telefone", "==", telefoneDebounced.trim())
        );

        const snapshot = await getDocs(q);
        const existe = !snapshot.empty;

        setClienteExiste(existe);

        if (!existe) {
          setProjetosDoCliente([]);
          setClienteIdSelecionado("");
          return;
        }

        const clienteDoc = snapshot.docs[0];
        const clienteId = clienteDoc.id;

        setClienteIdSelecionado(clienteId);

        const projetosRef = collection(db, "clientes", clienteId, "projetos");
        const projetosSnap = await getDocs(projetosRef);

        const projetos = projetosSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            nomeProjeto: data.nomeProjeto || "Sem nome",
            criadoEm: data.criadoEm || Timestamp.now(),
          };
        });

        setProjetosDoCliente(projetos);
      } catch (e) {
        console.error("Erro ao verificar cliente/carregar projetos:", e);
        setClienteExiste(false);
        setProjetosDoCliente([]);
        setClienteIdSelecionado("");
      } finally {
        setLoadingClienteProjetos(false);
      }
    };

    verificarCliente();
  }, [nomeClienteDebounced, telefoneDebounced]);

  // =========================================================
  // 3) Criar novo orçamento
  // =========================================================

  const handleIniciarOrcamento = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Usuário não autenticado!");
      return;
    }

    if (!projetoSelecionado) {
      alert("Selecione um projeto antes de continuar.");
      return;
    }

    try {
      const projetoInfo = projetosDoCliente.find((p) => p.id === projetoSelecionado);

      const orcamentoRef = await addDoc(
        collection(db, "clientes", clienteIdSelecionado, "projetos", projetoSelecionado, "orcamentos"),
        {
          clienteId: clienteIdSelecionado,
          projetoId: projetoSelecionado,

          // denormalização leve
          clienteNome: nomeCliente.trim(),
          clienteTelefone: telefone.trim(),
          nomeProjeto: projetoInfo?.nomeProjeto || "Sem nome",

          criadoEm: Timestamp.now(),
          ultimaModificacao: Timestamp.now(),

          criadoPor: user.uid,
          status: "emAndamento",
        }
      );

      router.push(
        `/orcamento/dados-orcamento?clienteId=${clienteIdSelecionado}&projetoId=${projetoSelecionado}&orcamentoId=${orcamentoRef.id}`
      );
    } catch (error) {
      console.error("Erro ao iniciar orçamento:", error);
      alert("Erro ao iniciar orçamento.");
    }
  };

  // =========================================================
  // 4) Listagem rápida (collectionGroup)
  // =========================================================

  useEffect(() => {
    const fetchListagem = async () => {
      try {
        setLoadingListagem(true);

        const orcQ = query(
          collectionGroup(db, "orcamentos"),
          orderBy("ultimaModificacao", "desc"),
          limit(300)
        );

        const orcSnap = await getDocs(orcQ);

        const itens = orcSnap.docs.map((d) => {
          const data = d.data() as any;

          // ✅ IDs do PATH (mais confiável)
          const { clienteId: cidPath, projetoId: pidPath } = extractIdsFromPath(d.ref.path);

          const criadoEm = toDateSafe(data.criadoEm);
          const ultimaModificacao = toDateSafe(data.ultimaModificacao, criadoEm);

          // compat: se você já teve versões com outros nomes
          const clienteNomeRaw = data.clienteNome ?? data.nomeCliente;
          const clienteTelefoneRaw = data.clienteTelefone ?? data.telefone;

          return {
            clienteId: cidPath || normStr(data.clienteId),
            projetoId: pidPath || normStr(data.projetoId),
            orcamentoId: d.id,

            status: normStr(data.status) || "emAndamento",

            criadoEm,
            ultimaModificacao,

            clienteNome: clienteNomeRaw as string | undefined,
            clienteTelefone: clienteTelefoneRaw as string | undefined,
            nomeProjeto: (data.nomeProjeto as string | undefined) ?? undefined,
          };
        });

        // se o doc não está no path esperado e não tem ids dentro, ele morre aqui
        const itensValidos = itens.filter((it) => it.clienteId && it.projetoId);

        const missingClienteIds = new Set<string>();
        const missingProjetoKeys = new Set<string>();

        for (const it of itensValidos) {
          const needsCliente =
            isMissingName(it.clienteNome) || isMissingPhone(it.clienteTelefone);

          if (needsCliente) missingClienteIds.add(it.clienteId);

          const needsProjeto = isMissingName(it.nomeProjeto);
          if (needsProjeto) missingProjetoKeys.add(`${it.clienteId}__${it.projetoId}`);
        }

        await Promise.all(
          Array.from(missingClienteIds).map(async (cid) => {
            if (clienteDocCacheRef.current.has(cid)) return;

            const snap = await getDoc(doc(db, "clientes", cid));
            clienteDocCacheRef.current.set(cid, snap.exists() ? snap.data() : null);
          })
        );

        await Promise.all(
          Array.from(missingProjetoKeys).map(async (key) => {
            if (projetoDocCacheRef.current.has(key)) return;

            const [cid, pid] = key.split("__");
            const snap = await getDoc(doc(db, "clientes", cid, "projetos", pid));
            projetoDocCacheRef.current.set(key, snap.exists() ? snap.data() : null);
          })
        );

        const mapCliente = new Map<string, ClienteComOrcamentos>();

        for (const it of itensValidos) {
          const cid = it.clienteId;
          const pid = it.projetoId;

          const clienteDoc = clienteDocCacheRef.current.get(cid) as any | null;

          // ✅ fonte da verdade: doc do cliente (se existir)
          const nomeFinal =
            normStr(clienteDoc?.nomeCliente) ||
            normStr(it.clienteNome) ||
            "Sem nome";

          const telFinal =
            normStr(clienteDoc?.telefone) ||
            normStr(it.clienteTelefone) ||
            "";

          const projKey = `${cid}__${pid}`;
          const projetoDoc = projetoDocCacheRef.current.get(projKey) as any | null;

          const nomeProjetoFinal =
            normStr(projetoDoc?.nomeProjeto) ||
            normStr(it.nomeProjeto) ||
            "Sem nome";

          const criadoProjetoFinal = toDateSafe(projetoDoc?.criadoEm, it.criadoEm);

          const orcItem: OrcamentoItem = {
            clienteId: cid,
            projetoId: pid,
            orcamentoId: it.orcamentoId,

            nomeProjeto: nomeProjetoFinal,
            criadoEm: criadoProjetoFinal,
            ultimaModificacao: it.ultimaModificacao,
            status: it.status,
          };

          if (!mapCliente.has(cid)) {
            mapCliente.set(cid, {
              id: cid,
              nomeCliente: nomeFinal,
              telefone: telFinal,
              projetos: [orcItem],
              statusCliente: "ativo" as const,
            });
          } else {
            mapCliente.get(cid)!.projetos.push(orcItem);
          }
        }

        const listaFinal: ClienteComOrcamentos[] = Array.from(mapCliente.values()).map((c) => {
          const clienteAtivo = c.projetos.some((p) => p.status !== "finalizado");
          const statusCliente: StatusCliente = clienteAtivo ? "ativo" : "inativo";
          return { ...c, statusCliente };
        });

        setClientesComOrcamento(listaFinal);
      } catch (e) {
        console.error("Erro ao carregar listagem de orçamentos:", e);
        setClientesComOrcamento([]);
      } finally {
        setLoadingListagem(false);
      }
    };

    fetchListagem();
  }, []);

  // =========================================================
  // 5) Excluir orçamento
  // =========================================================

  const handleExcluirOrcamento = async (clienteId: string, projetoId: string, orcamentoId: string) => {
    const confirmado = await confirm("Deseja realmente excluir este orçamento?");
    if (!confirmado) return;

    try {
      await deleteDoc(doc(db, "clientes", clienteId, "projetos", projetoId, "orcamentos", orcamentoId));

      setClientesComOrcamento((prev) =>
        prev
          .map((cli) =>
            cli.id === clienteId
              ? { ...cli, projetos: cli.projetos.filter((p) => p.orcamentoId !== orcamentoId) }
              : cli
          )
          .filter((cli) => cli.projetos.length > 0)
      );
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
    }
  };

  // =========================================================
  // 6) Filtros e ordenação
  // =========================================================

  const clientesFiltrados = useMemo(() => {
    const f = filtro.trim().toLowerCase();

    return clientesComOrcamento.filter((cliente) => {
      const nome = (cliente.nomeCliente || "").toLowerCase();
      const tel = (cliente.telefone || "").toLowerCase();

      const correspondeBusca = !f || nome.includes(f) || tel.includes(f);
      const correspondeStatus = filtroStatus === "todos" || cliente.statusCliente === filtroStatus;

      return correspondeBusca && correspondeStatus;
    });
  }, [clientesComOrcamento, filtro, filtroStatus]);

  const clientesOrdenados = useMemo(() => {
    const arr = [...clientesFiltrados];

    arr.sort((a, b) => {
      if (tipoOrdenacao === "modificacao_recente") {
        const dataA = Math.max(...a.projetos.map((p) => p.ultimaModificacao.getTime()));
        const dataB = Math.max(...b.projetos.map((p) => p.ultimaModificacao.getTime()));
        return dataB - dataA;
      }

      if (tipoOrdenacao === "modificacao_antiga") {
        const dataA = Math.max(...a.projetos.map((p) => p.ultimaModificacao.getTime()));
        const dataB = Math.max(...b.projetos.map((p) => p.ultimaModificacao.getTime()));
        return dataA - dataB;
      }

      if (tipoOrdenacao === "nome_az") return a.nomeCliente.localeCompare(b.nomeCliente);
      if (tipoOrdenacao === "nome_za") return b.nomeCliente.localeCompare(a.nomeCliente);

      return 0;
    });

    return arr;
  }, [clientesFiltrados, tipoOrdenacao]);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="text-white min-h-screen flex-1 justify-center items-center shadow-2xl p-10">
      {/* NOVO ORÇAMENTO */}
      <div className="p-8 mt-20 rounded-2xl shadow-2xl max-w-xl space-y-6 w-full justify-self-center mb-10">
        <h2 className="text-2xl font-bold text-center">Novo Orçamento</h2>

        {/* nome cliente */}
        <div className="relative">
          <p className="mb-1">Nome do Cliente:</p>

          <input
            type="text"
            placeholder="Nome do cliente"
            className="input input-bordered w-full"
            value={nomeCliente}
            onChange={(e) => {
              setNomeCliente(e.target.value);
              setMostrarSugestoes(true);
            }}
            required
          />

          {loadingAutocomplete && (
            <p className="text-xs text-gray-300 mt-1">Buscando clientes...</p>
          )}

          {mostrarSugestoes && sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
              {sugestoes.map((nome, index) => {
                const cli = clientes.find((c) => c.nomeCliente === nome);
                const tel = cli?.telefone ?? "";

                return (
                  <li
                    key={index}
                    className="p-2 hover:bg-base-200 cursor-pointer"
                    onClick={() => handleSelecionarSugestao(nome)}
                  >
                    {nome} {tel ? `( ${tel} )` : ""}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* telefone */}
        <div>
          <p className="mb-1">Telefone:</p>
          <IMaskInput
            mask="(00) 00000-0000"
            placeholder="Telefone"
            value={telefone}
            className="input input-bordered w-full"
            onAccept={(value: any) => setTelefone(value)}
            required
          />

          {loadingClienteProjetos && (
            <p className="text-xs text-gray-300 mt-1">
              Verificando cliente e projetos...
            </p>
          )}
        </div>

        {clienteExiste === false && (
          <div className="text-red-500 text-sm bg-red-100 border border-red-400 rounded-md p-2">
            Cliente não encontrado. Inicie um projeto primeiro na tela de{" "}
            <strong>Novo Projeto</strong>.
          </div>
        )}

        {clienteExiste && (
          <div>
            <label className="block mb-1">Selecione o projeto</label>

            {projetosDoCliente.length > 0 ? (
              <select
                className="select select-bordered w-full"
                value={projetoSelecionado}
                onChange={(e) => setProjetoSelecionado(e.target.value)}
              >
                <option value="">Selecione um projeto</option>
                {projetosDoCliente.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nomeProjeto} - {format(proj.criadoEm.toDate(), "dd/MM/yyyy")}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-red-500 bg-red-100 border border-red-300 p-2 rounded">
                Este cliente ainda não possui nenhum projeto registrado.
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleIniciarOrcamento}
          className="btn btn-primary w-full"
          disabled={!clienteExiste || projetosDoCliente.length === 0 || !projetoSelecionado}
        >
          Continuar
        </button>
      </div>

      {/* LISTAGEM */}
      <div className="overflow-x-auto mx-10">
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

          <div className="ml-6">
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

          <div className="ml-6">
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

        {loadingListagem && (
          <p className="text-sm text-gray-300 mb-3">Carregando orçamentos...</p>
        )}

        <table className="table w-full">
          <thead>
            <tr className="text-gray-100 text-[1rem] bg-[#1a1a1a]">
              <th className="p-4">
                <FontAwesomeIcon icon={faUser} className="mr-2 text-sky-700" />
                Nome do Cliente
              </th>
              <th className="p-4">
                <FontAwesomeIcon icon={faPhone} className="mr-2 text-red-500" />
                Telefone
              </th>
              <th className="p-4">Última Modificação</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {clientesOrdenados.map((cliente) => (
              <Fragment key={cliente.id}>
                <tr
                  className="hover:bg-base-200 cursor-pointer"
                  onClick={() => toggleCliente(cliente.id)}
                >
                  <td className="p-4 text-white font-medium">{cliente.nomeCliente}</td>
                  <td className="p-4 text-gray-300">{cliente.telefone}</td>
                  <td className="p-4">
                    {format(
                      Math.max(...cliente.projetos.map((p) => p.ultimaModificacao.getTime())),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </td>
                  <td className="p-4">
                    {cliente.statusCliente === "ativo" ? (
                      <span className="badge badge-success">Ativo</span>
                    ) : (
                      <span className="badge badge-error">Inativo</span>
                    )}
                  </td>
                </tr>

                {clienteAberto === cliente.id &&
                  cliente.projetos.map((proj) => (
                    <tr key={`${proj.projetoId}_${proj.orcamentoId}`}>
                      <td colSpan={4}>
                        <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 mb-2">
                              <div>
                                <span className="font-bold text-white">Status:</span>{" "}
                                {proj.status === "finalizado" ? (
                                  <span className="badge badge-success">Finalizado</span>
                                ) : (
                                  <span className="badge badge-warning">Em Andamento</span>
                                )}
                              </div>

                              <p className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon icon={faFolderOpen} className="text-blue-400" />
                                Projeto: <span className="font-normal">{proj.nomeProjeto}</span>
                              </p>

                              <div className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-400" />
                                Criado em:{" "}
                                <span className="font-normal">
                                  {format(proj.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              router.push(
                                `/orcamento/dados-orcamento?clienteId=${cliente.id}&projetoId=${proj.projetoId}&orcamentoId=${proj.orcamentoId}`
                              )
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xl transition duration-300"
                          >
                            Ver Orçamento
                          </button>

                          <button
                            onClick={() => handleExcluirOrcamento(cliente.id, proj.projetoId, proj.orcamentoId)}
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
    </div>
  );
}
