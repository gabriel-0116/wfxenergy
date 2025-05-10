"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { useAlert } from "@/context/AlertContext";
import { useConfirm } from "@/context/ConfirmContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faFolderOpen,
  faPhone,
  faSearch,
  faUser,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";

// Tipagem do projeto com dados de resumo incluídos
type Projeto = {
  id: string;
  nomeProjeto: string;
  criadoEm: Date;
  consumoMedioMes?: number;
  consumoMedioDia?: number;
  qtdPlacas?: number;
  qtdPlacasManual?: number;
  potenciaInversor?: number;
  potenciaInversorManual?: number;
  modo?: string;
  areaMinimaTotal?: number;
  totalComImposto?: number;
  potenciaPlaca?: string;
  status?: string;
  geracaoMensal?: number;
  geracaoDiaria?: number;
  ultimaModificacao?: Date;
};

type ClienteComProjetos = {
  id: string;
  nomeCliente: string;
  telefone: string;
  projetos: Projeto[];
  statusCliente: "ativo" | "inativo"; // ✅ NOVO CAMPO
};

export default function ProjetoPage() {
  const router = useRouter();

  const [clientesComProjetos, setClientesComProjetos] = useState<
    ClienteComProjetos[]
  >([]);
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [tipoOrdenacao, setTipoOrdenacao] = useState<
    "modificacao_recente" | "modificacao_antiga" | "nome_az" | "nome_za"
  >("modificacao_recente");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");

  const { showAlert } = useAlert();
  const { confirm } = useConfirm();

  const handleVerProjeto = (clienteId: string, projetoId: string) => {
    router.push(
      `/projeto/novoprojeto/consumo?clienteId=${clienteId}&projetoId=${projetoId}`
    );
  };

  useEffect(() => {
    const buscarDados = async () => {
      const clientesSnapshot = await getDocs(collection(db, "clientes"));
      const resultado: ClienteComProjetos[] = [];

      for (const clienteDoc of clientesSnapshot.docs) {
        const clienteId = clienteDoc.id;
        const data = clienteDoc.data();
        const nomeCliente = data.nomeCliente || "Sem nome";
        const telefone = data.telefone || "Sem telefone";

        const projetosRef = collection(db, "clientes", clienteId, "projetos");
        const projetosQuery = query(
          projetosRef,
          orderBy("ultimaModificacao", "desc")
        );
        const projetosSnapshot = await getDocs(projetosQuery);

        const projetos: Projeto[] = [];

        for (const docProj of projetosSnapshot.docs) {
          const p = docProj.data();
          const projetoId = docProj.id;

          const precificacaoSnap = await getDocs(
            collection(
              db,
              `clientes/${clienteId}/projetos/${projetoId}/precificacao`
            )
          );

          let status = "emAndamento";
          precificacaoSnap.forEach((doc) => {
            const prec = doc.data();
            if (prec.status === "finalizado") {
              status = "finalizado";
            }
          });

          projetos.push({
            id: projetoId,
            nomeProjeto: p.nomeProjeto || "Sem nome",
            criadoEm: p.criadoEm?.toDate?.() || new Date(),
            ultimaModificacao:
              p.ultimaModificacao?.toDate?.() ||
              p.criadoEm?.toDate?.() ||
              new Date(),
            consumoMedioMes: p.consumoMedioMes,
            consumoMedioDia: p.consumoMedioDia,
            qtdPlacas: p.qtdPlacas,
            qtdPlacasManual: p.qtdPlacasManual,
            potenciaInversor: p.potenciaInversor,
            potenciaInversorManual: p.potenciaInversorManual,
            modo: p.modo,
            areaMinimaTotal: p.areaMinimaTotal,
            totalComImposto: p.totalComImposto,
            potenciaPlaca: p.potenciaPlaca,
            geracaoMensal: p.geracaoMensal,
            geracaoDiaria: p.geracaoDiaria,
            status,
          });
        }

        // ✅ pula clientes sem nenhum projeto
        if (projetos.length === 0) continue;

        const clienteAtivo = projetos.some((p) => p.status !== "finalizado");

        resultado.push({
          id: clienteId,
          nomeCliente,
          telefone,
          projetos,
          statusCliente: clienteAtivo ? "ativo" : "inativo",
        });
      }
      setClientesComProjetos(resultado);
    };

    buscarDados();
  }, []);

  const clientesFiltrados = clientesComProjetos.filter((cliente) => {
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
        ...a.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      const dataB = Math.max(
        ...b.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      return dataB - dataA;
    }

    if (tipoOrdenacao === "modificacao_antiga") {
      const dataA = Math.max(
        ...a.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      const dataB = Math.max(
        ...b.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
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

  const toggleCliente = (clienteId: string) => {
    setClienteAberto((prev) => (prev === clienteId ? null : clienteId));
  };

  const handleExcluirProjeto = async (clienteId: string, projetoId: string) => {
    const confirmado = await confirm("Deseja realmente excluir este projeto?");
    if (!confirmado) return;

    try {
      await deleteDoc(doc(db, "clientes", clienteId, "projetos", projetoId));
      showAlert("Projeto excluído com sucesso!", "success");

      setClientesComProjetos((prev) => {
        return prev
          .map((cliente) => {
            if (cliente.id === clienteId) {
              const novosProjetos = cliente.projetos.filter(
                (p) => p.id !== projetoId
              );

              // 🔴 Se não sobrar nenhum projeto, remove o cliente
              if (novosProjetos.length === 0) return null;

              return {
                ...cliente,
                projetos: novosProjetos,
                statusCliente: novosProjetos.some(
                  (p) => p.status !== "finalizado"
                )
                  ? "ativo"
                  : "inativo",
              };
            }

            return cliente;
          })
          .filter((c): c is ClienteComProjetos => c !== null); // 🧼 Remove os nulls
      });
    } catch (error) {
      showAlert("Erro ao excluir projeto!", "error");
    }
  };

  return (
    <section className="p-10 bg-[#212325] text-white min-h-screen">
      <div className="flex justify-center mb-10">
        <div className="card bg-base-100 shadow-2xl border border-base-300 rounded-2xl p-8 flex flex-col items-center text-center transition-transform hover:scale-[1.02]">
          <h2 className="text-xl font-semibold mb-6">
            Gostaria de Iniciar um novo Projeto ?
          </h2>
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
              <option value="modificacao_recente">
                Mais recentes primeiro
              </option>
              <option value="modificacao_antiga">Mais antigos primeiro</option>
              <option value="nome_az">Nome A → Z</option>
              <option value="nome_za">Nome Z → A</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="text-gray-100 text-[1rem] bg-[#1a1a1a]">
              <th className="p-4">
                <span>
                  <FontAwesomeIcon
                    icon={faUser}
                    className="mr-2 text-sky-700"
                  />
                </span>
                Nome do Cliente
              </th>
              <th className="p-4">
                <span>
                  <FontAwesomeIcon
                    icon={faPhone}
                    className="mr-2 text-red-500"
                  />
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
                        ...cliente.projetos.map(
                          (p) =>
                            p.ultimaModificacao?.getTime?.() ||
                            p.criadoEm.getTime()
                        )
                      ),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`badge ${
                        cliente.statusCliente === "ativo"
                          ? "badge-success"
                          : "badge-error"
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
                            {/* Projeto + Data + Status */}
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
                                  {proj.status === "finalizado"
                                    ? "Finalizado"
                                    : "Em Andamento"}
                                </span>
                              </p>
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
                              <p className="font-semibold text-md flex items-center gap-2">
                                🕒 Última modificação:
                                <span className="font-normal">
                                  {format(
                                    proj.ultimaModificacao ?? proj.criadoEm,
                                    "dd/MM/yyyy",
                                    { locale: ptBR }
                                  )}
                                </span>
                              </p>
                              <div>
                                <span className="font-bold text-white">
                                  Consumo:
                                </span>{" "}
                                {proj.consumoMedioMes ?? "-"} kWh/mês{" "}
                                {proj.consumoMedioDia
                                  ? `| ${proj.consumoMedioDia} kWh/dia`
                                  : ""}
                              </div>
                            </div>

                            {/* Informações técnicas do projeto */}
                            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-300">
                              <div>
                                <span className="font-bold text-white">
                                  Kit Fotovoltaico:
                                </span>{" "}
                                {proj.modo === "manual"
                                  ? `${proj.qtdPlacasManual || "-"} placas | ${
                                      proj.potenciaInversorManual || "-"
                                    } kWp | ${proj.potenciaPlaca || "-"} W`
                                  : `${proj.qtdPlacas || "-"} placas | ${
                                      proj.potenciaInversor || "-"
                                    } kWp | ${proj.potenciaPlaca || "-"} W`}
                              </div>
                              {proj.geracaoMensal && (
                                <div>
                                  <span className="font-bold text-white">
                                    Geração Mensal:
                                  </span>{" "}
                                  {proj.geracaoMensal.toFixed(2)} kWh
                                </div>
                              )}
                              {proj.geracaoDiaria && (
                                <div>
                                  <span className="font-bold text-white">
                                    Geração Diária:
                                  </span>{" "}
                                  {proj.geracaoDiaria.toFixed(2)} kWh
                                </div>
                              )}
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
                              handleVerProjeto(cliente.id, proj.id)
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xl transition duration-300"
                          >
                            Ver Projeto
                          </button>
                          <button
                            onClick={() =>
                              handleExcluirProjeto(cliente.id, proj.id)
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
    </section>
  );
}
