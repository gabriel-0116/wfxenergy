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
};

type ClienteComProjetos = {
  id: string;
  nomeCliente: string;
  telefone: string;
  projetos: Projeto[];
};

export default function ProjetoPage() {
  const router = useRouter();

  const [clientesComProjetos, setClientesComProjetos] = useState<
    ClienteComProjetos[]
  >([]);
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

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

        // ✅ Ordenando projetos pela data de criação
        const projetosQuery = query(projetosRef, orderBy("criadoEm", "desc"));
        const projetosSnapshot = await getDocs(projetosQuery);

        const projetos: Projeto[] = [];

        for (const docProj of projetosSnapshot.docs) {
          const p = docProj.data();
          const projetoId = docProj.id;

          // Verifica se há precificação com status 'finalizado'
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

        resultado.push({ id: clienteId, nomeCliente, telefone, projetos });
      }

      setClientesComProjetos(resultado);
    };

    buscarDados();
  }, []);

  const toggleCliente = (clienteId: string) => {
    setClienteAberto((prev) => (prev === clienteId ? null : clienteId));
  };

  const handleExcluirProjeto = async (clienteId: string, projetoId: string) => {
    const confirmado = await confirm("Deseja realmente excluir este projeto?");
    if (!confirmado) return;

    try {
      await deleteDoc(doc(db, "clientes", clienteId, "projetos", projetoId));
      showAlert("Projeto excluído com sucesso!", "success");

      setClientesComProjetos((prev) =>
        prev
          .map((cliente) => ({
            ...cliente,
            projetos: cliente.projetos.filter((p) => p.id !== projetoId),
          }))
          .filter((cliente) => cliente.projetos.length > 0)
      );
    } catch (error) {
      showAlert("Erro ao excluir projeto!", "error");
    }
  };

  return (
    <section className="p-10 bg-[#212325] text-white min-h-screen">
      <div className="flex justify-center mb-10">
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-8 shadow-xl flex flex-col items-center text-center transition-transform hover:scale-[1.02]">
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
              <th className="p-4">
                <span>
                  <FontAwesomeIcon
                    icon={faPhone}
                    className="mr-2 text-red-500"
                  />
                </span>{" "}
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {clientesComProjetos
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
                    <td className="p-4 text-white font-medium">
                      {cliente.nomeCliente}
                    </td>
                    <td className="p-4 text-gray-300">{cliente.telefone}</td>
                    <td className="p-4">
                      {/* Badge de status dentro da <td> própria da coluna Status */}
                      {cliente.projetos.length > 0 && (
                        <span
                          className={`badge ${
                            cliente.projetos[0].status === "finalizado"
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {cliente.projetos[0].status === "finalizado"
                            ? "Finalizado"
                            : "Em Andamento"}
                        </span>
                      )}
                    </td>
                  </tr>

                  {clienteAberto === cliente.id &&
                    cliente.projetos.map((proj) => (
                      <tr key={proj.id}>
                        <td colSpan={3} className="p-2">
                          <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              {/* Projeto + Data + Status */}
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
                              </div>

                              {/* Informações técnicas do projeto */}
                              <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-300">
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
