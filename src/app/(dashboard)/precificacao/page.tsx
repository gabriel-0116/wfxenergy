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
  faBolt,
  faFolderOpen,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IMaskInput } from "react-imask";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export default function PrecificacaoPage() {
  const router = useRouter();
  const { confirm } = useConfirm(); // ✅ Importado para confirmação

  // Estados dos campos de entrada
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [clientesComPrecificacao, setClientesComPrecificacao] = useState<any[]>(
    []
  );
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

          const precificacaoSnap = await getDocs(
            collection(
              db,
              `clientes/${clienteId}/projetos/${projetoId}/precificacao`
            )
          );

          if (!precificacaoSnap.empty) {
            for (const precificacaoDoc of precificacaoSnap.docs) {
              const precificacaoId = precificacaoDoc.id;
              const precificacaoData = precificacaoDoc.data();
              const ultimaModificacao =
                precificacaoData.ultimaModificacao?.toDate?.() ?? new Date();

              const dadosPrecRef = doc(
                db,
                `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
                precificacaoId
              );
              const dadosPrecSnap = await getDoc(dadosPrecRef);
              const dadosPrec = dadosPrecSnap.exists()
                ? dadosPrecSnap.data()
                : {};

              projetos.push({
                id: projetoId, // ✅ agora o ID é só o projetoId correto
                projetoId: projetoId, // ✅ salva o projetoId separado para usar depois
                nomeProjeto: dadosProjeto.nomeProjeto,
                criadoEm: dadosProjeto.criadoEm?.toDate() ?? new Date(),
                consumoMedioMes: dadosProjeto.consumoMedioMes,
                consumoMedioDia: dadosProjeto.consumoMedioDia,
                qtdPlacas: dadosProjeto.qtdPlacas,
                qtdPlacasManual: dadosProjeto.qtdPlacasManual,
                modo: dadosProjeto.modo,
                potenciaPlaca: dadosProjeto.potenciaPlaca,
                potenciaInversor: dadosProjeto.potenciaInversor,
                potenciaInversorManual: dadosProjeto.potenciaInversorManual,
                areaMinimaTotal: dadosProjeto.areaMinimaTotal,
                totalComImposto: dadosProjeto.totalComImposto,
                precificacaoId,
                status: precificacaoData.status || "emAndamento",
                valorFinalProjeto: dadosPrec.valorFinalProjeto || null,
                parcelaSelecionada: dadosPrec.parcelaSelecionada || null,
                entrada: dadosPrec.entrada || 0,
                ultimaModificacao: precificacaoData.ultimaModificacao ?? null,
                totalVenda: dadosPrec.totalVenda || null,
                qtdParcelas: dadosPrec.qtdParcelas || 0,
                financiamentoSelecionado:
                  dadosPrec.financiamentoSelecionado || null,
                margemLucroLiquida:
                  dadosPrec.margemLucroLiquida !== undefined &&
                  dadosPrec.margemLucroLiquida !== null
                    ? Number(dadosPrec.margemLucroLiquida)
                    : null,
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

      setClientesComPrecificacao(lista);
    };

    fetchClientes();
  }, []);

  const clientesFiltrados = clientesComPrecificacao.filter((cliente) => {
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
            p.ultimaModificacao?.toDate?.().getTime?.() ||
            p.criadoEm?.toDate?.().getTime?.() ||
            0
        )
      );
      const dataB = Math.max(
        ...b.projetos.map(
          (p: any) => p.ultimaModificacao?.toDate?.().getTime?.() ?? 0
        )
      );
      return dataB - dataA;
    }

    if (tipoOrdenacao === "modificacao_antiga") {
      const dataA = Math.max(
        ...a.projetos.map(
          (p: any) => p.ultimaModificacao?.toDate?.().getTime?.() ?? 0
        )
      );
      const dataB = Math.max(
        ...b.projetos.map(
          (p: any) => p.ultimaModificacao?.toDate?.().getTime?.() ?? 0
        )
      );
      return dataA - dataB;
    }

    if (tipoOrdenacao === "nome_az") {
      return a.nomeCliente.localeCompare(b.nomeCliente);
    }

    if (tipoOrdenacao === "nome_za") {
      return b.nomeCliente.localeCompare(a.nomeCliente);
    }

    return 0;
  });

  // 🔥 Agora com confirmação
  const handleExcluirProjeto = async (
    clienteId: string,
    projetoId: string,
    precificacaoId: string
  ) => {
    const confirmado = await confirm(
      "Deseja realmente excluir esta precificação?"
    );
    if (!confirmado) return;

    try {
      // ✅ Deleta o dadosPrecificacao primeiro
      await deleteDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/dadosPrecificacao`,
          precificacaoId
        )
      );

      // ✅ Depois deleta a precificação
      await deleteDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}`
        )
      );

      // Atualiza a tela removendo
      setClientesComPrecificacao((prev) =>
        prev
          .map((cli) =>
            cli.id === clienteId
              ? {
                  ...cli,
                  projetos: cli.projetos.filter(
                    (p: any) => p.precificacaoId !== precificacaoId
                  ),
                }
              : cli
          )
          .filter((cli) => cli.projetos.length > 0)
      );
    } catch (err) {
      console.error("Erro ao excluir precificação:", err);
    }
  };

  // ✅ MANTER: Redireciona para a tela de dados da precificação
  const handleVerProjeto = (
    clienteId: string,
    projetoId: string,
    precificacaoId: string
  ) => {
    router.push(
      `/precificacao/dados-precificacao?clienteId=${clienteId}&projetoId=${projetoId}&precificacaoId=${precificacaoId}`
    );
  };

  // Lista de clientes encontrados
  const [clientes, setClientes] = useState<
    { nomeCliente: string; telefone: string; id: string }[]
  >([]);

  // Estado para saber se o cliente existe no banco
  const [clienteExiste, setClienteExiste] = useState<boolean | null>(null);

  // ID do cliente encontrado no Firestore
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState<string>("");

  // Lista de projetos do cliente
  const [projetosDoCliente, setProjetosDoCliente] = useState<
    { id: string; nomeProjeto: string; criadoEm: Timestamp }[]
  >([]);

  // ID do projeto selecionado no dropdown
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("");

  const [listaPrecificacoes, setListaPrecificacoes] = useState<
    {
      clienteId: string;
      nomeCliente: string;
      telefone: string;
      projetoId: string;
      nomeProjeto: string;
      precificacaoId: string;
      criadoEm: Timestamp;
      status: string;
      margemLucroLiquida: number;
      ultimaModificacao: Timestamp;
    }[]
  >([]);

  useEffect(() => {
    const carregarPrecificacoes = async () => {
      const clientesSnap = await getDocs(collection(db, "clientes"));
      const listaFinal: typeof listaPrecificacoes = [];

      for (const clienteDoc of clientesSnap.docs) {
        const clienteData = clienteDoc.data();
        const clienteId = clienteDoc.id;

        const projetosSnap = await getDocs(
          collection(db, `clientes/${clienteId}/projetos`)
        );

        for (const projetoDoc of projetosSnap.docs) {
          const projetoId = projetoDoc.id;
          const projetoData = projetoDoc.data();

          const precificacoesSnap = await getDocs(
            collection(
              db,
              `clientes/${clienteId}/projetos/${projetoId}/precificacao`
            )
          );

          for (const precificacaoDoc of precificacoesSnap.docs) {
            const precificacaoId = precificacaoDoc.id;
            const precificacaoData = precificacaoDoc.data();
            const ultimaModificacao =
              precificacaoData.ultimaModificacao?.toDate?.() || new Date();
            // Verifica se existe contrato com o mesmo ID da precificação
            const contratoSnap = await getDocs(
              collection(
                db,
                `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/contrato`
              )
            );

            const temContrato = !contratoSnap.empty;

            listaFinal.push({
              clienteId,
              nomeCliente: clienteData.nomeCliente || "Sem nome",
              telefone: clienteData.telefone || "",
              projetoId,
              nomeProjeto: projetoData.nomeProjeto || "Sem nome",
              precificacaoId,
              criadoEm: precificacaoData.criadoEm || Timestamp.now(),
              status: precificacaoData.status || "emAndamento",
              ultimaModificacao,
              margemLucroLiquida:
                Number(precificacaoData.margemLucroLiquida) || 0,
            });
          }
        }
      }

      setListaPrecificacoes(listaFinal);
    };

    carregarPrecificacoes();
  }, []);

  // Busca clientes no Firestore conforme o nome digitado (para autocomplete)
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

  // Ao selecionar uma sugestão do nome, preenche os campos e limpa sugestões
  const handleSelecionarSugestao = (nome: string) => {
    const cliente = clientes.find((c) => c.nomeCliente === nome);

    if (cliente) {
      setNomeCliente(cliente.nomeCliente);
      setTelefone(cliente.telefone);
      setSugestoes([]);
    }
  };

  // Verifica se o cliente existe e busca seus projetos
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

        // Se cliente encontrado, salva o ID e busca os projetos
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

  // Ao clicar em continuar
  const handleIniciarPrecificacao = async () => {
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
      const precificacaoRef = await addDoc(
        collection(
          db,
          `clientes/${clienteIdSelecionado}/projetos/${projetoSelecionado}/precificacao`
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
        `/precificacao/dados-precificacao?clienteId=${clienteIdSelecionado}&projetoId=${projetoSelecionado}&precificacaoId=${precificacaoRef.id}`
      );
    } catch (error) {
      console.error("Erro ao iniciar precificação:", error);
      alert("Erro ao iniciar precificação.");
    }
  };

  return (
    <div className="text-white min-h-screen flex-1 justify-center items-center shadow-2xl p-10">
      <div className="p-8 mt-20 rounded-2xl shadow-2xl max-w-xl space-y-6 w-full justify-self-center mb-10">
        <h2 className="text-2xl font-bold text-center">Nova Precificação</h2>

        {/* Campo de nome com autocomplete */}
        <div className="relative">
          <p className="mb-1">Nome do Cliente:</p>
          <input
            type="text"
            placeholder="Nome do cliente"
            className="input input-bordered w-full"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            required
          />
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
              {sugestoes.map((nome, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-base-200 cursor-pointer"
                  onClick={() => handleSelecionarSugestao(nome)}
                >
                  {nome}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Campo de telefone com máscara */}
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

        {/* ⚠️ Mensagem caso o cliente não exista */}
        {clienteExiste === false && (
          <div className="text-red-500 text-sm bg-red-100 border border-red-400 rounded-md p-2">
            Cliente não encontrado. Inicie um projeto primeiro na tela de{" "}
            <strong>Novo Projeto</strong>.
          </div>
        )}

        {/* Dropdown de seleção de projeto (se houver projetos) */}
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

        {/* Botão de continuar */}
        <button
          onClick={handleIniciarPrecificacao}
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

      {/* Tabela */}
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
                            p.ultimaModificacao?.toDate?.() ??
                            p.ultimaModificacao ??
                            p.criadoEm;
                          return data?.getTime?.() ?? 0;
                        })
                      )
                      ,
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
                    <tr key={`${proj.projetoId}_${proj.precificacaoId}`}>
                      <td colSpan={4} className="">
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
                                Data de Criação:{" "}
                                <span className="font-normal">
                                  {format(proj.criadoEm, "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                              <div>
                                {proj.ultimaModificacao && (
                                  <p>
                                    <span className="font-semibold">
                                      🕒 Última Modificação:
                                    </span>{" "}
                                    <span className="font-normal">
                                      {format(
                                        Math.max(
                                          ...cliente.projetos.map((p: any) => {
                                            const data =
                                              p.ultimaModificacao?.toDate?.() ??
                                              p.ultimaModificacao ??
                                              p.criadoEm;
                                            return data?.getTime?.() ?? 0;
                                          })
                                        )
                                        ,
                                        "dd/MM/yyyy",
                                        { locale: ptBR }
                                      )}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-300">
                              <div>
                                <span className="font-bold text-white">
                                  Consumo:
                                </span>{" "}
                                {proj.consumoMedioMes ?? "-"} kWh/mês{" "}
                                {proj.consumoMedioDia
                                  ? `| ${proj.consumoMedioDia} kWh/dia`
                                  : ""}
                              </div>
                              <div>
                                <span className="font-bold text-white">
                                  Qtd. Placas:
                                </span>{" "}
                                {proj.modo === "manual"
                                  ? `${proj.qtdPlacasManual || "-"} placas | ${
                                      proj.potenciaInversorManual || "-"
                                    } kWp | ${proj.potenciaPlaca || "-"} W`
                                  : `${proj.qtdPlacas || "-"} placas | ${
                                      proj.potenciaInversor || "-"
                                    } kWp | ${proj.potenciaPlaca || "-"} W`}
                              </div>
                              {proj.areaMinimaTotal && (
                                <div>
                                  <span className="font-bold text-white">
                                    Área Mínima:
                                  </span>{" "}
                                  {proj.areaMinimaTotal.toFixed(2)} m²
                                </div>
                              )}
                              {proj.totalComImposto && (
                                <div>
                                  <span className="font-bold text-white">
                                    Estimativa:
                                  </span>{" "}
                                  R$ {proj.totalComImposto.toFixed(2)}
                                </div>
                              )}
                              {/* ✅ NOVO BLOCO DE INFORMAÇÕES */}
                              {proj.valorFinalProjeto && (
                                <div>
                                  <span className="font-bold text-white">
                                    Valor Final:
                                  </span>{" "}
                                  R$ {proj.valorFinalProjeto.toFixed(2)}
                                </div>
                              )}

                              <div>
                                <span className="font-bold text-white">
                                  Entrada:
                                </span>{" "}
                                R$ {proj.entrada?.toFixed(2) ?? 0}
                              </div>
                              {proj.parcelaSelecionada && (
                                <div>
                                  <span className="font-bold text-white">
                                    Forma de Pagamento:
                                  </span>{" "}
                                  {proj.parcelaSelecionada === "avista"
                                    ? "À Vista"
                                    : `Parcelado em ${
                                        proj.financiamentoSelecionado
                                          ?.parcelas || "?"
                                      }x`}
                                </div>
                              )}

                              {proj.financiamentoSelecionado?.valorParcela && (
                                <div>
                                  <span className="font-bold text-white">
                                    Valor da Parcela:
                                  </span>{" "}
                                  R${" "}
                                  {proj.financiamentoSelecionado.valorParcela.toFixed(
                                    2
                                  )}
                                </div>
                              )}
                              {proj.margemLucroLiquida !== null && (
                                <div>
                                  <span className="font-bold text-white">
                                    Margem de Lucro Líquida:
                                  </span>{" "}
                                  {proj.margemLucroLiquida.toFixed(0)}%
                                </div>
                              )}
                              <p>
                                <strong>Valor à Vista:</strong> R${" "}
                                {proj?.totalVenda?.toFixed(2) ?? "---"}
                              </p>

                              <p>
                                <strong>Total Financiado:</strong>{" "}
                                {proj?.financiamentoSelecionado
                                  ? `R$ ${(
                                      parseFloat(proj.entrada || "0") +
                                      proj.financiamentoSelecionado.totalPago
                                    ).toFixed(2)}`
                                  : "---"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleVerProjeto(
                                cliente.id,
                                proj.projetoId,
                                proj.precificacaoId
                              )
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xl transition duration-300"
                          >
                            Ver Precificação
                          </button>
                          <button
                            onClick={() =>
                              handleExcluirProjeto(
                                cliente.id,
                                proj.id.split("_")[0], // ✅ separa o projetoId
                                proj.precificacaoId
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
