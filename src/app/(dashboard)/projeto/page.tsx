"use client"; // 🔹 Indica para o Next.js que esse componente roda no lado do cliente (usa hooks, window, etc).

// 🔹 Importa Fragment (para agrupar múltiplos elementos sem criar uma div extra),
//    useEffect (efeitos colaterais) e useState (estado interno) do React.
import { Fragment, useEffect, useState } from "react";

// 🔹 Hook de navegação do Next App Router para redirecionar o usuário entre páginas.
import { useRouter } from "next/navigation";

// 🔹 Funções do Firestore que vamos usar para:
//    - collection: referenciar coleções
//    - getDocs: buscar documentos de uma coleção ou query
//    - doc: referenciar um documento específico
//    - deleteDoc: apagar um documento
//    - orderBy: ordenar os resultados de uma consulta
//    - query: montar uma consulta com filtros/ordenação
//    - where: filtrar por campo (usaremos para olhar status em "orcamentos")
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  orderBy,
  query,
  where,
} from "firebase/firestore";

// 🔹 Importa a instância do Firestore configurada no seu projeto.
import { db } from "@/firebase/firebaseConfig";

// 🔹 date-fns para formatar datas.
import { format } from "date-fns";

// 🔹 Locale pt-BR para formatar datas no padrão brasileiro.
import { ptBR } from "date-fns/locale/pt-BR";

// 🔹 Contexto de alerta global (para mostrar mensagens de sucesso/erro).
import { useAlert } from "@/context/AlertContext";

// 🔹 Contexto de confirmação (modal de "Tem certeza que deseja excluir?").
import { useConfirm } from "@/context/ConfirmContext";

// 🔹 Componente de ícones do FontAwesome.
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// 🔹 Ícones específicos usados na interface desta página.
import {
  faCalendarAlt,
  faFolderOpen,
  faPhone,
  faSearch,
  faUser,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";

// 🔹 Tipagem do objeto Projeto, representando um projeto de um cliente.
type Projeto = {
  id: string; // ID do documento do projeto (na subcoleção de projetos do cliente).
  nomeProjeto: string; // Nome do projeto exibido na UI.
  criadoEm: Date; // Data de criação já convertida de Timestamp para Date.
  consumoMedioMes?: number; // Consumo médio mensal em kWh.
  consumoMedioDia?: number; // Consumo médio diário em kWh.
  qtdPlacas?: number; // Quantidade de placas no modo automático.
  qtdPlacasManual?: number; // Quantidade de placas no modo manual.
  potenciaPico?: number; // Potência total do sistema (kWp) no modo automático.
  potenciaPicoManual?: number; // Potência total do sistema (kWp) no modo manual.
  modo?: string; // "manual" ou outro modo que você estiver usando.
  areaMinimaTotal?: number; // Área mínima necessária para instalação.
  totalComImposto?: number; // Valor estimado com impostos.
  potenciaPlaca?: string; // Potência individual da placa (em W) representada como string.
  status?: string; // Status do projeto: "emAndamento" ou "finalizado" (definido pelos orçamentos).
  geracaoMensal?: number; // Geração mensal estimada.
  geracaoDiaria?: number; // Geração diária estimada.
  ultimaModificacao?: Date; // Data da última modificação (para ordenação).
};

// 🔹 Estrutura que representa um cliente com a lista de seus projetos.
type ClienteComProjetos = {
  id: string; // ID do documento do cliente.
  nomeCliente: string; // Nome do cliente.
  telefone: string; // Telefone do cliente.
  projetos: Projeto[]; // Lista de projetos vinculados a esse cliente.
  statusCliente: "ativo" | "inativo"; // Status calculado com base nos projetos (se tem projeto em andamento ou não).
};

export default function ProjetoPage() {
  // 🔹 Hook de navegação do Next.
  const router = useRouter();

  // 🔹 Estado que guarda a lista de clientes com seus respectivos projetos.
  const [clientesComProjetos, setClientesComProjetos] = useState<
    ClienteComProjetos[]
  >([]);

  // 🔹 Guarda qual cliente está "aberto" (expandido) na tabela para exibir os projetos abaixo.
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);

  // 🔹 Texto digitado no campo de busca (cliente/projeto).
  const [filtro, setFiltro] = useState("");

  // 🔹 Tipo de ordenação atual aplicada à lista de clientes.
  const [tipoOrdenacao, setTipoOrdenacao] = useState<
    "modificacao_recente" | "modificacao_antiga" | "nome_az" | "nome_za"
  >("modificacao_recente");

  // 🔹 Filtro de status aplicado (todos, ativo, inativo).
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">(
    "todos"
  );

  // 🔹 Hook do contexto de alertas para exibir mensagens ao usuário.
  const { showAlert } = useAlert();

  // 🔹 Hook do contexto de confirmação para perguntar antes de excluir.
  const { confirm } = useConfirm();

  // 🔹 Função chamada ao clicar em "Ver Projeto", redireciona para a tela de edição/visualização.
  const handleVerProjeto = (clienteId: string, projetoId: string) => {
    // 👉 Monta a URL com query params clienteId e projetoId.
    router.push(
      `/projeto/novoprojeto/consumo?clienteId=${clienteId}&projetoId=${projetoId}`
    );
  };

  // 🔹 useEffect responsável por buscar os dados no Firestore quando a página carrega.
  useEffect(() => {
    // 🔹 Função assíncrona interna para poder usar await dentro do useEffect.
    const buscarDados = async () => {
      // 👉 Busca todos os documentos da coleção "clientes".
      const clientesSnapshot = await getDocs(collection(db, "clientes"));

      // 🔹 Array temporário que vai acumular a estrutura ClienteComProjetos.
      const resultado: ClienteComProjetos[] = [];

      // 🔹 Percorre cada documento de cliente retornado do Firestore.
      for (const clienteDoc of clientesSnapshot.docs) {
        const clienteId = clienteDoc.id; // ID do cliente.
        const data = clienteDoc.data(); // Dados crus do cliente.
        const nomeCliente = data.nomeCliente || "Sem nome"; // Fallback caso não tenha nome.
        const telefone = data.telefone || "Sem telefone"; // Fallback caso não tenha telefone.

        // 👉 Referência para a subcoleção "projetos" dentro de cada cliente.
        const projetosRef = collection(db, "clientes", clienteId, "projetos");

        // 👉 Cria uma query para pegar os projetos ordenados por "ultimaModificacao" (do mais recente para o mais antigo).
        const projetosQuery = query(
          projetosRef,
          orderBy("ultimaModificacao", "desc")
        );

        // 👉 Executa a query e obtém os projetos desse cliente.
        const projetosSnapshot = await getDocs(projetosQuery);

        // 🔹 Array temporário para guardar os projetos desse cliente.
        const projetos: Projeto[] = [];

        // 🔹 Percorre cada projeto desse cliente.
        for (const docProj of projetosSnapshot.docs) {
          const p = docProj.data(); // Dados crus do projeto.
          const projetoId = docProj.id; // ID do projeto.

          // 🔹 Referência para a subcoleção "orcamentos" dentro deste projeto específico.
          const orcamentosRef = collection(
            db,
            "clientes",
            clienteId,
            "projetos",
            projetoId,
            "orcamentos"
          );

          // 🔹 Query que busca apenas orçamentos com status "finalizado".
          //    Isso é mais performático do que buscar todos e filtrar em código.
          const orcamentosFinalizadosQuery = query(
            orcamentosRef,
            where("status", "==", "finalizado")
          );

          // 🔹 Executa a query de orçamentos finalizados.
          const orcamentosFinalizadosSnapshot = await getDocs(
            orcamentosFinalizadosQuery
          );

          // 🔹 Se encontrar pelo menos um orçamento com status "finalizado",
          //    consideramos que o projeto está finalizado. Caso contrário,
          //    o projeto é considerado "emAndamento".
          const status = orcamentosFinalizadosSnapshot.empty
            ? "emAndamento"
            : "finalizado";

          // 🔹 Monta o objeto Projeto com todos os campos necessários,
          //    convertendo Timestamps do Firestore para Date do JavaScript.
          projetos.push({
            id: projetoId,
            nomeProjeto: p.nomeProjeto || "Sem nome", // Nome do projeto ou fallback.
            criadoEm: p.criadoEm?.toDate?.() || new Date(), // Converte Timestamp para Date, ou usa Date() como fallback.
            ultimaModificacao:
              p.ultimaModificacao?.toDate?.() ||
              p.criadoEm?.toDate?.() ||
              new Date(), // Usa ultimaModificacao, senão criadoEm, senão Date() atual.
            consumoMedioMes: p.consumoMedioMes, // Copia os campos de consumo, se existirem.
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
            status, // ✅ Status calculado com base na existência de orçamentos finalizados.
          });
        }

        // 🔹 Se o cliente não tiver nenhum projeto, pulamos ele e não adicionamos à lista.
        if (projetos.length === 0) continue;

        // 🔹 Define se o cliente está "ativo" ou "inativo" com base nos projetos:
        //    - ativo: possui pelo menos um projeto com status diferente de "finalizado"
        //    - inativo: todos os projetos estão finalizados
        const clienteAtivo = projetos.some((p) => p.status !== "finalizado");

        // 🔹 Adiciona esse cliente (com seus projetos) ao array de resultado.
        resultado.push({
          id: clienteId,
          nomeCliente,
          telefone,
          projetos,
          statusCliente: clienteAtivo ? "ativo" : "inativo",
        });
      }

      // 🔹 Após percorrer todos os clientes, atualiza o estado principal com o resultado.
      setClientesComProjetos(resultado);
    };

    // 👉 Chama a função assíncrona definida acima.
    buscarDados();

    // 🔎 Array de dependências vazio => roda apenas uma vez, quando o componente é montado.
  }, []);

  // 🔹 Aplica o filtro de busca (nome/telefone) e o filtro de status (ativo/inativo/todos).
  const clientesFiltrados = clientesComProjetos.filter((cliente) => {
    const nome = cliente.nomeCliente?.toLowerCase() || ""; // Nome em minúsculo para comparação.
    const telefone = cliente.telefone?.toLowerCase() || ""; // Telefone em minúsculo.
    const correspondeBusca = nome.includes(filtro) || telefone.includes(filtro); // Verifica se filtro aparece no nome ou telefone.
    const correspondeStatus =
      filtroStatus === "todos" || cliente.statusCliente === filtroStatus; // Verifica se o status do cliente bate com o filtro.
    return correspondeBusca && correspondeStatus; // Só mantém clientes que atendem ambos os critérios.
  });

  // 🔹 Cria uma cópia do array filtrado e aplica a ordenação selecionada.
  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => {
    // 👉 Ordenação por última modificação mais recente primeiro.
    if (tipoOrdenacao === "modificacao_recente") {
      const dataA = Math.max(
        ...a.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      const dataB = Math.max(
        ...b.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      return dataB - dataA; // Mais recente vem primeiro.
    }

    // 👉 Ordenação por última modificação mais antiga primeiro.
    if (tipoOrdenacao === "modificacao_antiga") {
      const dataA = Math.max(
        ...a.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      const dataB = Math.max(
        ...b.projetos.map((p) => p.ultimaModificacao?.getTime?.() ?? 0)
      );
      return dataA - dataB; // Mais antigo vem primeiro.
    }

    // 👉 Ordenação pelo nome do cliente de A → Z.
    if (tipoOrdenacao === "nome_az") {
      return a.nomeCliente.localeCompare(b.nomeCliente);
    }

    // 👉 Ordenação pelo nome do cliente de Z → A.
    if (tipoOrdenacao === "nome_za") {
      return b.nomeCliente.localeCompare(a.nomeCliente);
    }

    // 👉 Caso não bata nenhum tipo (fallback).
    return 0;
  });

  // 🔹 Alterna qual cliente está "expandido" na tabela.
  const toggleCliente = (clienteId: string) => {
    // 👉 Se o cliente clicado já está aberto, fecha (seta null). Caso contrário, abre ele.
    setClienteAberto((prev) => (prev === clienteId ? null : clienteId));
  };

  // 🔹 Função para excluir um projeto específico de um cliente.
  const handleExcluirProjeto = async (clienteId: string, projetoId: string) => {
    // 👉 Usa o hook de confirmação para perguntar ao usuário se deseja mesmo excluir.
    const confirmado = await confirm("Deseja realmente excluir este projeto?");
    if (!confirmado) return; // Se o usuário cancelar, não faz nada.

    try {
      // 👉 Deleta o documento do projeto na subcoleção do cliente.
      await deleteDoc(doc(db, "clientes", clienteId, "projetos", projetoId));

      // 👉 Mostra alerta de sucesso.
      showAlert("Projeto excluído com sucesso!", "success");

      // 👉 Atualiza o estado local removendo o projeto excluído.
      setClientesComProjetos((prev) => {
        return prev
          .map((cliente) => {
            // Se não for o cliente do projeto excluído, mantém como está.
            if (cliente.id !== clienteId) return cliente;

            // 🔹 Filtra os projetos do cliente para remover o projeto excluído.
            const novosProjetos = cliente.projetos.filter(
              (p) => p.id !== projetoId
            );

            // 👉 Se não sobrar nenhum projeto, retornamos null para esse cliente
            //    e ele será removido na sequência pelo filter.
            if (novosProjetos.length === 0) return null;

            // 🔹 Recalcula o status do cliente com base nos projetos restantes.
            return {
              ...cliente,
              projetos: novosProjetos,
              statusCliente: novosProjetos.some(
                (p) => p.status !== "finalizado"
              )
                ? "ativo"
                : "inativo",
            };
          })
          .filter((c): c is ClienteComProjetos => c !== null); // 🧼 Remove os clientes que viraram null.
      });
    } catch (error) {
      // 👉 Se algo der errado ao excluir, mostra alerta de erro genérico.
      showAlert("Erro ao excluir projeto!", "error");
    }
  };

  // 🔹 Retorno JSX que descreve a UI da página de projetos.
  return (
    <section className="p-10 bg-[#212325] text-white min-h-screen">
      {/* 🔹 Card no topo com CTA para iniciar um novo projeto */}
      <div className="flex justify-center mb-10">
        <div className="card bg-base-100 shadow-2xl border border-base-300 rounded-2xl p-8 flex flex-col items-center text-center transition-transform hover:scale-[1.02]">
          <h2 className="text-xl font-semibold mb-6">
            Gostaria de Iniciar um novo Projeto ?
          </h2>
          <button
            onClick={() => router.push("/projeto/novoprojeto")} // 👉 Redireciona para a página de criação de novo projeto.
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-800 hover:to-indigo-700 transition-all duration-300 shadow-md text-white font-semibold"
          >
            <FontAwesomeIcon icon={faUserPlus} />
            Iniciar Projeto
          </button>
        </div>
      </div>

      {/* 🔹 Barra de filtros: busca, filtro de status e ordenação */}
      <div className="flex items-center justify-between mb-6">
        {/* 🔹 Campo de busca por nome ou telefone do cliente */}
        <div className="flex items-center w-96">
          <button className="btn btn-square rounded-r-none">
            <FontAwesomeIcon icon={faSearch} />
          </button>
          <input
            type="text"
            placeholder="Pesquisar cliente ou projeto..."
            className="input input-bordered rounded-l-none w-full"
            value={filtro} // 👉 Valor do input controlado pelo estado.
            onChange={(e) => setFiltro(e.target.value.toLowerCase())} // 👉 Atualiza o estado com o texto em minúsculo.
          />
        </div>

        {/* 🔹 Filtros à direita: Status e Ordenar por */}
        <div className="flex gap-6">
          {/* 🔹 Filtro de status (todos / ativos / inativos) */}
          <div>
            <label className="text-white font-medium mr-2">Status:</label>
            <select
              value={filtroStatus} // 👉 Valor selecionado ligado ao estado.
              onChange={(e) => setFiltroStatus(e.target.value as any)} // 👉 Atualiza o estado conforme o usuário troca.
              className="select select-bordered bg-gray-800 text-white"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>

          {/* 🔹 Filtro de ordenação (por data ou nome) */}
          <div className="">
            <label className="text-white font-medium mr-2 flex items-center w-32">
              Ordenar por:
            </label>
            <select
              value={tipoOrdenacao} // 👉 Valor atual de ordenação.
              onChange={(e) => setTipoOrdenacao(e.target.value as any)} // 👉 Atualiza o tipo de ordenação ao trocar.
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

      {/* 🔹 Tabela de clientes e seus projetos */}
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
            {/* 🔹 Percorre os clientes já filtrados e ordenados para montar as linhas da tabela */}
            {clientesOrdenados.map((cliente) => (
              <Fragment key={cliente.id}>
                {/* 🔹 Linha principal de cada cliente (clicável para expandir/fechar projetos) */}
                <tr
                  className="hover:bg-base-200 cursor-pointer"
                  onClick={() => toggleCliente(cliente.id)} // 👉 Alterna o clienteAberto.
                >
                  <td className="p-4 text-white font-medium">
                    {cliente.nomeCliente}
                  </td>
                  <td className="p-4 text-gray-300">{cliente.telefone}</td>
                  <td className="p-4">
                    {format(
                      // 👉 Pega a maior data de última modificação entre os projetos desse cliente.
                      Math.max(
                        ...cliente.projetos.map(
                          (p) =>
                            p.ultimaModificacao?.getTime?.() ||
                            p.criadoEm.getTime()
                        )
                      ),
                      "dd/MM/yyyy", // 👉 Formato de data brasileiro.
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

                {/* 🔹 Se este cliente está aberto, renderiza as linhas extras com os projetos dele */}
                {clienteAberto === cliente.id &&
                  cliente.projetos.map((proj) => (
                    <tr key={proj.id}>
                      <td colSpan={4} className="p-2">
                        <div className="bg-[#1e293b] border border-[#334155] p-5 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            {/* 🔹 Bloco com status, nome do projeto, datas e consumo */}
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

                            {/* 🔹 Bloco com informações técnicas do kit fotovoltaico */}
                            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-300">
                              <div>
                                <span className="font-bold text-white">
                                  Kit Fotovoltaico:
                                </span>{" "}
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

                          {/* 🔹 Botão para abrir a tela de detalhes do projeto */}
                          <button
                            onClick={() =>
                              handleVerProjeto(cliente.id, proj.id)
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xl transition duration-300"
                          >
                            Ver Projeto
                          </button>

                          {/* 🔹 Botão para excluir o projeto */}
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
