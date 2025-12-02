"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/context/ConfirmContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
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

export default function OrcamentoPage() {
  const router = useRouter();
  const { confirm } = useConfirm();

  // 📦 estados básicos
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [clientes, setClientes] = useState<
    { nomeCliente: string; telefone: string; id: string }[]
  >([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [clienteExiste, setClienteExiste] = useState<boolean | null>(null);
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState("");
  const [projetosDoCliente, setProjetosDoCliente] = useState<
    { id: string; nomeProjeto: string; criadoEm: Timestamp }[]
  >([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState("");

  // 📋 listagem
  const [clientesComOrcamento, setClientesComOrcamento] = useState<any[]>([]);
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [tipoOrdenacao, setTipoOrdenacao] = useState<
    "modificacao_recente" | "modificacao_antiga" | "nome_az" | "nome_za"
  >("modificacao_recente");

  const toggleCliente = (id: string) => {
    setClienteAberto(clienteAberto === id ? null : id);
  };

  // 🔍 buscar clientes para autocomplete
  useEffect(() => {
    const buscarClientes = async () => {
      if (nomeCliente.length < 1) {
        setSugestoes([]);
        return;
      }

      const ref = collection(db, "clientes");
      const q = query(ref);
      const snapshot = await getDocs(q);

      const encontrados: {
        nomeCliente: string;
        telefone: string;
        id: string;
      }[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.nomeCliente &&
          data.nomeCliente.toLowerCase().includes(nomeCliente.toLowerCase())
        ) {
          encontrados.push({
            nomeCliente: data.nomeCliente,
            telefone: data.telefone,
            id: docSnap.id,
          });
        }
      });

      setClientes(encontrados);
      setSugestoes(encontrados.map((c) => c.nomeCliente));
    };

    buscarClientes();
  }, [nomeCliente]);

  // preencher quando clicar numa sugestão
  const handleSelecionarSugestao = (nome: string) => {
    const cliente = clientes.find((c) => c.nomeCliente === nome);
    if (cliente) {
      setNomeCliente(cliente.nomeCliente);
      setTelefone(cliente.telefone);
      setSugestoes([]);
      setMostrarSugestoes(false);
    }
  };

  // verificar cliente existente + carregar projetos
  useEffect(() => {
    const verificarCliente = async () => {
      if (nomeCliente && telefone) {
        const q = query(
          collection(db, "clientes"),
          where("nomeCliente", "==", nomeCliente),
          where("telefone", "==", telefone)
        );

        const snapshot = await getDocs(q);
        const existe = !snapshot.empty;
        setClienteExiste(existe);

        if (existe) {
          const clienteDoc = snapshot.docs[0];
          const clienteId = clienteDoc.id;
          setClienteIdSelecionado(clienteId);

          const projetosRef = collection(db, `clientes/${clienteId}/projetos`);
          const projetosSnap = await getDocs(projetosRef);

          const projetos = projetosSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              nomeProjeto: data.nomeProjeto || "Sem nome",
              criadoEm: data.criadoEm || Timestamp.now(),
            };
          });

          setProjetosDoCliente(projetos);
        } else {
          setProjetosDoCliente([]);
          setClienteIdSelecionado("");
        }
      } else {
        setClienteExiste(null);
        setProjetosDoCliente([]);
        setClienteIdSelecionado("");
      }
    };

    verificarCliente();
  }, [nomeCliente, telefone]);

  // ➕ criar novo orçamento
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
      const orcamentoRef = await addDoc(
        collection(
          db,
          `clientes/${clienteIdSelecionado}/projetos/${projetoSelecionado}/orcamentos`
        ),
        {
          clienteId: clienteIdSelecionado,
          projetoId: projetoSelecionado,
          clienteNome: nomeCliente,
          criadoEm: Timestamp.now(),
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

  // carregar orçamentos existentes
  useEffect(() => {
    const fetchClientes = async () => {
      const snapshotClientes = await getDocs(collection(db, "clientes"));
      const lista: any[] = [];

      for (const docCli of snapshotClientes.docs) {
        const clienteId = docCli.id;
        const clienteData = docCli.data();

        const projetosSnap = await getDocs(
          collection(db, `clientes/${clienteId}/projetos`)
        );
        const projetos = [];

        for (const docProj of projetosSnap.docs) {
          const projetoId = docProj.id;
          const dadosProjeto = docProj.data();

          const orcamentosSnap = await getDocs(
            collection(
              db,
              `clientes/${clienteId}/projetos/${projetoId}/orcamentos`
            )
          );

          if (!orcamentosSnap.empty) {
            for (const orcamentoDoc of orcamentosSnap.docs) {
              const orcamentoId = orcamentoDoc.id;
              const orcamentoData = orcamentoDoc.data();

              projetos.push({
                id: projetoId,
                projetoId,
                nomeProjeto: dadosProjeto.nomeProjeto,
                criadoEm: dadosProjeto.criadoEm?.toDate?.() ?? new Date(),
                status: orcamentoData.status || "emAndamento",
                orcamentoId,
                ultimaModificacao:
                  orcamentoData.ultimaModificacao?.toDate?.() ?? new Date(),
              });
            }
          }
        }

        const clienteAtivo = projetos.some(
          (p: any) => p.status !== "finalizado"
        );

        if (projetos.length > 0) {
          lista.push({
            id: clienteId,
            nomeCliente: clienteData.nomeCliente,
            telefone: clienteData.telefone,
            projetos,
            statusCliente: clienteAtivo ? "ativo" : "inativo",
          });
        }
      }

      setClientesComOrcamento(lista);
    };

    fetchClientes();
  }, []);

  // excluir orçamento
  const handleExcluirOrcamento = async (
    clienteId: string,
    projetoId: string,
    orcamentoId: string
  ) => {
    const confirmado = await confirm("Deseja realmente excluir este orçamento?");
    if (!confirmado) return;

    try {
      await deleteDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/orcamentos/${orcamentoId}`
        )
      );

      setClientesComOrcamento((prev) =>
        prev
          .map((cli) =>
            cli.id === clienteId
              ? {
                  ...cli,
                  projetos: cli.projetos.filter(
                    (p: any) => p.orcamentoId !== orcamentoId
                  ),
                }
              : cli
          )
          .filter((cli) => cli.projetos.length > 0)
      );
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
    }
  };

  // filtros e ordenação
  const clientesFiltrados = clientesComOrcamento.filter((cliente) => {
    const nome = cliente.nomeCliente?.toLowerCase() || "";
    const telefone = cliente.telefone?.toLowerCase() || "";
    const correspondeBusca = nome.includes(filtro) || telefone.includes(filtro);
    const correspondeStatus =
      filtroStatus === "todos" || cliente.statusCliente === filtroStatus;
    return correspondeBusca && correspondeStatus;
  });

  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => {
    if (tipoOrdenacao === "modificacao_recente") {
      const dataA = Math.max(
        ...a.projetos.map(
          (p: any) =>
            p.ultimaModificacao?.getTime?.() ||
            p.criadoEm?.getTime?.() ||
            0
        )
      );
      const dataB = Math.max(
        ...b.projetos.map(
          (p: any) => p.ultimaModificacao?.getTime?.() ?? 0
        )
      );
      return dataB - dataA;
    }
    if (tipoOrdenacao === "modificacao_antiga") {
      const dataA = Math.max(
        ...a.projetos.map(
          (p: any) => p.ultimaModificacao?.getTime?.() ?? 0
        )
      );
      const dataB = Math.max(
        ...b.projetos.map(
          (p: any) => p.ultimaModificacao?.getTime?.() ?? 0
        )
      );
      return dataA - dataB;
    }
    if (tipoOrdenacao === "nome_az") return a.nomeCliente.localeCompare(b.nomeCliente);
    if (tipoOrdenacao === "nome_za") return b.nomeCliente.localeCompare(a.nomeCliente);
    return 0;
  });

  // ========================= UI =========================
  return (
    <div className="text-white min-h-screen flex-1 justify-center items-center shadow-2xl p-10">
      {/* novo orçamento */}
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
          {mostrarSugestoes && sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
              {sugestoes.map((nome, index) => {
                const cliente = clientes.find((c) => c.nomeCliente === nome);
                const telefone = cliente?.telefone ?? "";
                return (
                  <li
                    key={index}
                    className="p-2 hover:bg-base-200 cursor-pointer"
                    onClick={() => handleSelecionarSugestao(nome)}
                  >
                    {nome} {telefone ? `( ${telefone} )` : ""}
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
        </div>

        {/* se cliente não existe */}
        {clienteExiste === false && (
          <div className="text-red-500 text-sm bg-red-100 border border-red-400 rounded-md p-2">
            Cliente não encontrado. Inicie um projeto primeiro na tela de{" "}
            <strong>Novo Projeto</strong>.
          </div>
        )}

        {/* projeto dropdown */}
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
                    {proj.nomeProjeto} -{" "}
                    {format(proj.criadoEm.toDate(), "dd/MM/yyyy")}
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

        {/* continuar */}
        <button
          onClick={handleIniciarOrcamento}
          className="btn btn-primary w-full"
          disabled={
            !clienteExiste ||
            projetosDoCliente.length === 0 ||
            !projetoSelecionado
          }
        >
          Continuar
        </button>
      </div>

      {/* tabela listagem */}
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
              <option value="modificacao_recente">
                Mais recentes primeiro
              </option>
              <option value="modificacao_antiga">Mais antigos primeiro</option>
              <option value="nome_az">Nome A → Z</option>
              <option value="nome_za">Nome Z → A</option>
            </select>
          </div>
        </div>

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
                  <td className="p-4 text-white font-medium">
                    {cliente.nomeCliente}
                  </td>
                  <td className="p-4 text-gray-300">{cliente.telefone}</td>
                  <td className="p-4">
                    {format(
                      Math.max(
                        ...cliente.projetos.map((p: any) => {
                          const data =
                            p.ultimaModificacao ??
                            p.criadoEm;
                          return data?.getTime?.() ?? 0;
                        })
                      ),
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
                  cliente.projetos.map((proj: any) => (
                    <tr key={`${proj.projetoId}_${proj.orcamentoId}`}>
                      <td colSpan={4}>
                        <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 mb-2">
                              <div>
                                <span className="font-bold text-white">
                                  Status:
                                </span>{" "}
                                {proj.status === "finalizado" ? (
                                  <span className="badge badge-success">
                                    Finalizado
                                  </span>
                                ) : (
                                  <span className="badge badge-warning">
                                    Em Andamento
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faFolderOpen}
                                  className="text-blue-400"
                                />
                                Projeto:{" "}
                                <span className="font-normal">
                                  {proj.nomeProjeto}
                                </span>
                              </p>
                              <div className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faCalendarAlt}
                                  className="text-blue-400"
                                />
                                Criado em:{" "}
                                <span className="font-normal">
                                  {format(proj.criadoEm, "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
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
                            onClick={() =>
                              handleExcluirOrcamento(
                                cliente.id,
                                proj.projetoId,
                                proj.orcamentoId
                              )
                            }
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
