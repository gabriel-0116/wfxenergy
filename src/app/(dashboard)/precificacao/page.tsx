"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  deleteDoc,
  doc,
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

  // Estados dos campos de entrada
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [clientesComPrecificacao, setClientesComPrecificacao] = useState<any[]>(
    []
  );
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  // Função para abrir/fechar clientes
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
            projetos.push({
              id: projetoId,
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
              precificacaoId: precificacaoSnap.docs[0].id,
            });
          }
        }

        if (projetos.length > 0) {
          lista.push({
            id: clienteId,
            nomeCliente: clienteData.nomeCliente,
            telefone: clienteData.telefone,
            projetos,
          });
        }
      }

      setClientesComPrecificacao(lista);
    };

    fetchClientes();
  }, []);

  // Função para excluir um projeto
  const handleExcluirProjeto = async (
    clienteId: string,
    projetoId: string,
    precificacaoId: string
  ) => {
    try {
      await deleteDoc(
        doc(
          db,
          `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}`
        )
      );
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
            collection(db, `clientes/${clienteId}/projetos/${projetoId}/precificacao`)
          );
  
          for (const precificacaoDoc of precificacoesSnap.docs) {
            const precificacaoId = precificacaoDoc.id;
            const precificacaoData = precificacaoDoc.data();
  
            // Verifica se existe contrato com o mesmo ID da precificação
            const contratoSnap = await getDocs(
              collection(db, `clientes/${clienteId}/projetos/${projetoId}/precificacao/${precificacaoId}/contrato`)
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
              status: temContrato ? "finalizado" : "emAndamento",
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
    <div className="text-white h-[900px] flex-1 justify-center items-center shadow-2xl">
      <div className="p-8 mt-20 rounded-2xl shadow-2xl max-w-xl space-y-6 w-full justify-self-center">
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
        <div className="flex items-center justify-end mb-6">
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
              <th className="p-4">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {clientesComPrecificacao
              .filter((cliente) => {
                const nome = cliente.nomeCliente?.toLowerCase() || "";
                const telefone = cliente.telefone?.toLowerCase() || "";
                return nome.includes(filtro) || telefone.includes(filtro);
              })
              .map((cliente) => (
                <Fragment key={cliente.id}>
                 <tr
  className="hover:bg-base-200 cursor-pointer"
  onClick={() => toggleCliente(cliente.id)}
>
  <td className="p-4 text-white font-medium">{cliente.nomeCliente}</td>
  <td className="p-4 text-gray-300">{cliente.telefone}</td>
  <td className="p-4">
    {cliente.projetos.every((proj: any) => proj.status === "finalizado") ? (
      <span className="badge badge-success">Finalizado</span>
    ) : (
      <span className="badge badge-warning">Em Andamento</span>
    )}
  </td>
</tr>
                  {clienteAberto === cliente.id &&
                    cliente.projetos.map((proj: any) => (
                      <tr key={proj.id}>
                        <td colSpan={3} className="">
                          <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 mb-2">
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
                                <p className="font-semibold text-md flex items-center gap-2">
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
                                </p>
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
                                    ? `${
                                        proj.qtdPlacasManual || "-"
                                      } placas | ${
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
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleVerProjeto(
                                  cliente.id,
                                  proj.id,
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
                                  proj.id,
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
