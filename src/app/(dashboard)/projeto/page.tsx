"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faFolderOpen,
  faSearch,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";

// Tipagem do projeto com nome e data de criação
type Projeto = {
  id: string;
  nomeProjeto: string;
  criadoEm: Date;
};

// Tipagem do cliente com nome, telefone e projetos
type ClienteComProjetos = {
  id: string;
  nomeCliente: string;
  telefone: string;
  projetos: Projeto[];
};

export default function ProjetoPage() {
  const router = useRouter();

  // Estado para armazenar os clientes com seus projetos
  const [clientesComProjetos, setClientesComProjetos] = useState<
    ClienteComProjetos[]
  >([]);

  // Estado para armazenar o cliente atualmente aberto/expandido
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);

  // Filtro de busca (nome do cliente ou nome do projeto)
  const [filtro, setFiltro] = useState("");

  // 🔄 Ao carregar a página, buscar todos os clientes e seus projetos
  useEffect(() => {
    const buscarDados = async () => {
      const clientesSnapshot = await getDocs(collection(db, "clientes"));

      const resultado: ClienteComProjetos[] = [];

      // Para cada cliente encontrado no Firestore...
      for (const clienteDoc of clientesSnapshot.docs) {
        const clienteId = clienteDoc.id;
        const data = clienteDoc.data();
        const nomeCliente = data.nomeCliente || "Sem nome";
        const telefone = data.telefone || "Sem telefone";

        // Buscar projetos da subcoleção /projetos desse cliente
        const projetosSnapshot = await getDocs(
          collection(db, "clientes", clienteId, "projetos")
        );

        const projetos: Projeto[] = projetosSnapshot.docs.map((doc) => {
          const p = doc.data();
          return {
            id: doc.id,
            nomeProjeto: p.nomeProjeto || "Sem nome",
            criadoEm: p.criadoEm?.toDate?.() || new Date(),
          };
        });

        // Adiciona cliente + projetos na lista final
        resultado.push({ id: clienteId, nomeCliente, telefone, projetos });
      }

      setClientesComProjetos(resultado);
    };

    buscarDados();
  }, []);

  // Função para expandir ou recolher a linha do cliente clicado
  const toggleCliente = (clienteId: string) => {
    setClienteAberto((prev) => (prev === clienteId ? null : clienteId));
  };

  return (
    <section className="p-10 bg-[#212325] text-white min-h-screen">
      {/* Cabeçalho com botão de novo projeto e barra de pesquisa */}

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

      <div className="flex items-center justify-end">
        <div className="flex items-center w-96">
          <button className="btn btn-square rounded-r-none">
            <FontAwesomeIcon icon={faSearch} />
          </button>
          <input
            type="text"
            placeholder="Pesquisar"
            className="input input-bordered rounded-l-none"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value.toLowerCase())}
          />
        </div>
      </div>

      {/* Tabela DaisyUI estilizada igual à tela de clientes */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          {/* Cabeçalho da tabela */}
          <thead>
            <tr className="text-gray-300 text-sm">
              <th>Nome do Cliente</th>
              <th>Telefone</th>
            </tr>
          </thead>

          {/* Corpo da tabela */}
          <tbody>
            {clientesComProjetos
              // Filtro por nome do cliente ou nome do projeto
              .filter((cliente) => {
                const nome = cliente.nomeCliente?.toLowerCase() || "";
                const telefone = cliente.telefone?.toLowerCase() || "";
                const temProjeto = cliente.projetos.some((p) =>
                  p.nomeProjeto?.toLowerCase().includes(filtro)
                );

                // Filtra por nome, telefone ou nome de projeto
                return nome.includes(filtro) || telefone.includes(filtro);
              })

              .map((cliente) => (
                <Fragment key={cliente.id}>
                  {/* Linha principal do cliente */}
                  <tr
                    className="hover:bg-base-200 cursor-pointer"
                    onClick={() => toggleCliente(cliente.id)}
                  >
                    <td>{cliente.nomeCliente}</td>
                    <td>{cliente.telefone}</td>
                  </tr>

                  {/* Se a linha estiver aberta, mostra os projetos abaixo */}
                  {clienteAberto === cliente.id &&
                    cliente.projetos.map((proj) => (
                      <tr key={proj.id}>
                        <td colSpan={2} className="p-2">
                          <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                              {/* Nome do projeto */}
                              <p className="font-semibold text-md flex items-center gap-2 mb-2">
                                <FontAwesomeIcon
                                  icon={faFolderOpen}
                                  className="text-blue-400"
                                />
                                Projeto:{" "}
                                <span className="font-normal">
                                  {proj.nomeProjeto || "Sem nome"}
                                </span>
                              </p>

                              {/* Data */}
                              <p className="font-semibold text-md flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faCalendarAlt}
                                  className="text-blue-400"
                                />
                                <span className="text-white font-semibold">
                                 Data de Criação:{" "}
                                <span className="font-normal ml-1">
                                  {format(proj.criadoEm, "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                  </span>
                                </span>
                              </p>
                            </div>

                            {/* Botão de ação */}
                            <button
                              onClick={() =>
                                router.push(
                                  `/novoprojeto/resumo?clienteId=${cliente.id}&projetoId=${proj.id}`
                                )
                              }
                              className="btn btn-sm text-blue-400 border-white hover:bg-blue-400 hover:text-white transition ease-in"
                            >
                              Ver Projeto
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
