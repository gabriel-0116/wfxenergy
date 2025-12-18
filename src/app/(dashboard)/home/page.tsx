"use client";
// 🔹 Client Component porque usa hooks, localStorage e router.

import { useRouter } from "next/navigation";
// 🔹 Navegação programática no App Router.

import { useContext, useEffect, useState } from "react";
// 🔹 useContext: ler AuthContext
// 🔹 useEffect: executar efeitos (cache + buscar contadores)
// 🔹 useState: armazenar estados locais

import { AuthContext } from "@/context/AuthContext";
// 🔹 Seu contexto de autenticação (user, loading).

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// 🔹 Renderizador de ícones FontAwesome.

import {
  faDiagramProject,
  faFilePen,
  faFileContract,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
// 🔹 Ícones usados nos cards.

import { useAlert } from "@/context/AlertContext";
// 🔹 Contexto global de alertas.

import { db } from "@/firebase/firebaseConfig";
// 🔹 Instância do Firestore.

import {
  collectionGroup,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
/**
 * 🔹 collectionGroup: consulta global em todas subcoleções com o mesmo nome (ex.: "orcamentos")
 * 🔹 getCountFromServer: conta docs no servidor (não baixa docs) → MUITO mais rápido
 * 🔹 query/where: montar consulta
 */

// ==============================
// Tipos e constantes de cache
// ==============================

type HomeIndicadoresCache = {
  projetosEmAndamento: number;
  propostasPendentes: number;
  contratosEnviados: number;
  updatedAt: number; // timestamp ms
};
// 🔹 Tipo do objeto que vamos salvar no localStorage.

const HOME_CACHE_KEY = "home_indicadores_v1";
// 🔹 Chave do localStorage.

const HOME_CACHE_TTL_MS = 1000 * 60 * 5;
// 🔹 Cache válido por 5 minutos (ajuste se quiser).

export default function HomePage() {
  const { user, loading } = useContext(AuthContext) || {};
  // 🔹 Pega o usuário logado e loading do AuthContext.

  const router = useRouter();
  // 🔹 Hook para navegar.

  const { showAlert } = useAlert();
  // 🔹 Função para mostrar alertas.

  // ==============================
  // Estados dos cards
  // ==============================

  const [projetosEmAndamento, setProjetosEmAndamento] = useState<number>(0);
  // 🔹 Card 1: projetos que NÃO estão finalizados (statusProjeto != "finalizado" ou inexistente).

  const [propostasPendentes, setPropostasPendentes] = useState<number>(0);
  // 🔹 Card 2: orçamentos com status "emAndamento".

  const [contratosEnviados, setContratosEnviados] = useState<number>(0);
  // 🔹 Card 3: orçamentos com status "finalizado".

  const [carregandoIndicadores, setCarregandoIndicadores] = useState<boolean>(true);
  // 🔹 Controla o “...” na UI.

  const [atualizandoIndicadores, setAtualizandoIndicadores] = useState<boolean>(false);
  // 🔹 Diferente de carregando: aqui serve para saber se estamos atualizando no fundo.

  // ==============================
  // 1) Toast de sucesso via localStorage
  // ==============================

  useEffect(() => {
    // 🔹 Lê possível mensagem salva por outra tela.
    const alerta = localStorage.getItem("alertaHome");

    // 🔹 Se existir, exibe e remove (pra não repetir).
    if (alerta) {
      showAlert(alerta, "success");
      localStorage.removeItem("alertaHome");
    }
  }, [showAlert]);

  // ==============================
  // 2) Carrega cache IMEDIATO (parece instantâneo)
  // ==============================

  useEffect(() => {
    // 🔹 Não depende de user; é só pra melhorar percepção de velocidade.
    try {
      const raw = localStorage.getItem(HOME_CACHE_KEY);
      // 🔹 Lê o cache salvo.

      if (!raw) return;
      // 🔹 Se não tem cache, não faz nada.

      const parsed = JSON.parse(raw) as HomeIndicadoresCache;
      // 🔹 Converte string em objeto.

      const isFresh = Date.now() - parsed.updatedAt <= HOME_CACHE_TTL_MS;
      // 🔹 Verifica se cache ainda é “recente”.

      if (!isFresh) return;
      // 🔹 Se estiver velho, ignora.

      // ✅ Aplica cache no estado imediatamente (UI mostra números na hora)
      setProjetosEmAndamento(parsed.projetosEmAndamento);
      setPropostasPendentes(parsed.propostasPendentes);
      setContratosEnviados(parsed.contratosEnviados);

      // ✅ Como já temos algo pra mostrar, podemos desligar o “carregando...”
      setCarregandoIndicadores(false);
    } catch (e) {
      // 🔹 Se o cache estiver corrompido, ignora.
      console.warn("Cache da Home inválido, ignorando:", e);
    }
  }, []);

  // ==============================
  // 3) Busca indicadores REAL (rápido e barato)
  // ==============================

  useEffect(() => {
    // 🔹 Se ainda está carregando auth, não faz nada.
    if (loading) return;

    // 🔹 Se não tem user, não busca nada.
    if (!user) return;

    const carregarIndicadores = async () => {
      try {
        /**
         * ✅ Estratégia:
         * - Contar no servidor com getCountFromServer (não baixa docs)
         * - Tudo em paralelo com Promise.all
         *
         * Card 1: Projetos em andamento
         * - totalProjetos = count(collectionGroup("projetos"))
         * - projetosFinalizados = count(where("statusProjeto" == "finalizado"))
         * - emAndamento = totalProjetos - projetosFinalizados
         *
         * Card 2: Propostas pendentes
         * - count(collectionGroup("orcamentos") where status == "emAndamento")
         *
         * Card 3: Contratos enviados
         * - count(collectionGroup("orcamentos") where status == "finalizado")
         */

        // 🔹 Se já não está carregando (por causa do cache), entramos em “atualizando” no fundo.
        setAtualizandoIndicadores(true);
        // 🔹 Marca que estamos atualizando.

        setCarregandoIndicadores(true);
        // 🔹 Mantém a UI consistente quando não houver cache.

        // 🔹 Query: todos os projetos (subcoleções "projetos" em todos clientes).
        const qTotalProjetos = query(collectionGroup(db, "projetos"));

        // 🔹 Query: projetos finalizados (statusProjeto == "finalizado").
        const qProjetosFinalizados = query(
          collectionGroup(db, "projetos"),
          where("statusProjeto", "==", "finalizado")
        );

        // 🔹 Query: propostas pendentes (orçamentos em andamento).
        const qPropostasPendentes = query(
          collectionGroup(db, "orcamentos"),
          where("status", "==", "emAndamento")
        );

        // 🔹 Query: contratos enviados (orçamentos finalizados).
        const qContratosEnviados = query(
          collectionGroup(db, "orcamentos"),
          where("status", "==", "finalizado")
        );

        // 🔹 Executa as 4 contagens em paralelo (bem mais rápido que loops).
        const [
          totalProjetosSnap,
          projetosFinalizadosSnap,
          propostasPendentesSnap,
          contratosEnviadosSnap,
        ] = await Promise.all([
          getCountFromServer(qTotalProjetos),
          getCountFromServer(qProjetosFinalizados),
          getCountFromServer(qPropostasPendentes),
          getCountFromServer(qContratosEnviados),
        ]);

        // 🔹 Extrai counts do retorno.
        const totalProjetos = totalProjetosSnap.data().count;
        const projetosFinalizados = projetosFinalizadosSnap.data().count;
        const totalPendentes = propostasPendentesSnap.data().count;
        const totalContratos = contratosEnviadosSnap.data().count;

        // 🔹 Calcula em andamento por diferença.
        const totalEmAndamento = Math.max(totalProjetos - projetosFinalizados, 0);
        // 🔹 Math.max pra evitar negativo caso tenha inconsistência de dados.

        // ✅ Atualiza UI
        setProjetosEmAndamento(totalEmAndamento);
        setPropostasPendentes(totalPendentes);
        setContratosEnviados(totalContratos);

        // ✅ Salva cache para a próxima vez abrir “instantâneo”
        const cachePayload: HomeIndicadoresCache = {
          projetosEmAndamento: totalEmAndamento,
          propostasPendentes: totalPendentes,
          contratosEnviados: totalContratos,
          updatedAt: Date.now(),
        };

        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cachePayload));
        // 🔹 Persiste cache.
      } catch (error) {
        console.error("Erro ao carregar indicadores da Home:", error);
        // ⚠️ Se aparecer erro pedindo INDEX:
        // - O Firebase vai te dar um link
        // - Cria o índice e pronto (igual você fez no /orcamento)
      } finally {
        setCarregandoIndicadores(false);
        // 🔹 Para de mostrar “...”.

        setAtualizandoIndicadores(false);
        // 🔹 Para “atualizando no fundo”.
      }
    };

    carregarIndicadores();
  }, [loading, user]);

  // ==============================
  // Guardas de UI
  // ==============================

  if (loading) {
    // 🔹 Enquanto o AuthContext está carregando.
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Carregando...
      </div>
    );
  }

  if (!user) {
    // 🔹 Sem usuário (provavelmente middleware/guard vai redirecionar).
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Redirecionando...
      </div>
    );
  }

  // ==============================
  // UI principal
  // ==============================

  return (
    <>
      <section className="p-6 text-white">
        {/* Saudação */}
        <div className="bg-gradient-to-r from-[#0A478F]/20 to-[#1e293b]/40 border border-[#334155] rounded-xl p-6 shadow-md mb-10 flex items-center gap-4">
          <div className="text-4xl animate-wiggle">👋</div>
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Olá, {user?.displayName ?? "usuário"}!
            </h1>

            <p className="text-gray-400 text-sm">
              Algum cliente novo querendo orçamento?
              {/* 🔹 Micro-feedback se estiver atualizando no fundo */}
              {atualizandoIndicadores ? " (atualizando...)" : ""}
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="flex justify-center mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="card w-96 bg-[#1f2735] p-6 shadow-xl rounded-xl hover:scale-[1.02] transition-transform duration-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-base text-gray-300">Projetos em andamento</p>
                  <h2 className="text-3xl font-bold mt-1">
                    {carregandoIndicadores ? "..." : projetosEmAndamento}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Projetos que ainda não possuem contrato fechado.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Foco aqui: são seus projetos ativos na operação.
                  </p>
                  <button
                    onClick={() => router.push("/projeto")}
                    className="btn btn-outline btn-primary btn-sm w-full mt-3 flex items-center justify-self-center"
                  >
                    Ver projetos
                  </button>
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center ml-4"
                  style={{ backgroundColor: "#0A478F" }}
                >
                  <FontAwesomeIcon icon={faDiagramProject} className="text-white text-xl" />
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card w-96 bg-[#1f2735] p-6 shadow-xl rounded-xl hover:scale-[1.02] transition-transform duration-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-base text-gray-300">Propostas pendentes</p>
                  <h2 className="text-3xl font-bold mt-1">
                    {carregandoIndicadores ? "..." : propostasPendentes}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Propostas aguardando aprovação do cliente.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Acompanhe estas propostas para acelerar o fechamento.
                  </p>
                  <button
                    onClick={() => router.push("/proposta")}
                    className="btn btn-outline btn-primary btn-sm w-full mt-3 flex items-center justify-self-center"
                  >
                    Ver propostas
                  </button>
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center ml-4"
                  style={{ backgroundColor: "#F38B36" }}
                >
                  <FontAwesomeIcon icon={faFilePen} className="text-white text-xl" />
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="card w-96 bg-[#1f2735] p-6 shadow-xl rounded-xl hover:scale-[1.02] transition-transform duration-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-base text-gray-300">Contratos enviados</p>
                  <h2 className="text-3xl font-bold mt-1">
                    {carregandoIndicadores ? "..." : contratosEnviados}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Orçamentos com contrato gerado / projeto finalizado.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Aqui está o que teoricamente já virou dinheiro.
                  </p>
                  <button
                    onClick={() => router.push("/contrato")}
                    className="btn btn-outline btn-primary btn-sm w-full mt-3 flex items-center justify-self-center"
                  >
                    Ver contratos
                  </button>
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center ml-4"
                  style={{ backgroundColor: "#6E2279" }}
                >
                  <FontAwesomeIcon icon={faFileContract} className="text-white text-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-self-center items-center card bg-base-100 shadow-2xl border border-base-300 rounded-xl py-8 px-4 text-center max-w-xl mx-auto transition-transform hover:scale-[1.02]">
          <h3 className="text-xl font-semibold mb-4">Pronto para iniciar um novo Projeto?</h3>
          <button
            onClick={() => router.push("/projeto/novoprojeto")}
            className="flex justify-center items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-800 hover:to-indigo-700 transition-all duration-300 shadow-md text-white font-semibold"
          >
            <FontAwesomeIcon icon={faPlus} />
            Iniciar
          </button>
        </div>
      </section>
    </>
  );
}
