"use client"; // 👈 Indica para o Next que esse componente roda no lado do cliente (usa hooks, localStorage, etc).

// 🔹 Importa o hook useRouter para fazer navegação programática no App Router do Next 13+.
import { useRouter } from "next/navigation";

// 🔹 Hooks básicos do React para estado, efeito colateral e contexto.
import { useContext, useEffect, useState } from "react";

// 🔹 Importa o contexto de autenticação que você criou (AuthProvider).
import { AuthContext } from "@/context/AuthContext";

// 🔹 Importa o componente de ícones do FontAwesome.
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// 🔹 Importa os ícones específicos que você está usando nos cards.
import {
  faDiagramProject,
  faFilePen,
  faFileContract,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

// 🔹 Hook do seu contexto de alertas (toast/alerta global).
import { useAlert } from "@/context/AlertContext";

// 🔹 Importa a instância do Firestore inicializada no seu firebaseConfig.
import { db } from "@/firebase/firebaseConfig";

// 🔹 Importa as funções necessárias do Firestore para montar queries e contar documentos.
import {
  collection, // cria uma referência a uma coleção
  query, // permite compor filtros na coleção
  where, // adiciona cláusulas de filtro à query
  getCountFromServer, // retorna apenas a contagem de documentos, sem baixar todos
} from "firebase/firestore";

// 🔹 Tipo para organizar as métricas que vão aparecer nos cards.
type DashboardMetrics = {
  projetosEmAndamento: number; // quantidade de projetos com status "em_andamento"
  propostasPendentes: number; // quantidade de propostas com status "pendente"
  contratosEnviados: number; // quantidade de contratos com status "enviado"
};

export default function HomePage() {
  // 🔹 Pega os dados de autenticação do contexto.
  //    - user: usuário logado
  //    - signOut: função de logout (não está sendo usada aqui, mas vem do contexto)
  //    - role: papel do usuário (admin, vendedor, etc.)
  //    - loading: indica se o AuthProvider ainda está carregando o estado de login
  const { user, signOut, role, loading } = useContext(AuthContext) || {};

  // 🔹 Hook de navegação do Next App Router.
  const router = useRouter();

  // 🔹 Estado interno para controlar se o usuário está em processo de logout.
  //    Aqui na prática você nunca muda pra true nesse componente, mas estou mantendo
  //    porque pode ser usado se você acionar o signOut daqui no futuro.
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 🔹 Hook de alerta global para exibir mensagens (tipo toast).
  const { showAlert } = useAlert();

  // 🔹 Estado que guarda as métricas que vão para os cards.
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    projetosEmAndamento: 0,
    propostasPendentes: 0,
    contratosEnviados: 0,
  });

  // 🔹 Estado de loading específico das métricas do dashboard (independente do loading do Auth).
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);

  // 🔹 Estado para guardar uma mensagem de erro caso a busca no Firestore falhe.
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // 🔹 useEffect para ler o alerta salvo no localStorage (usado por outras telas).
  useEffect(() => {
    // 👉 Lê a chave "alertaHome" que alguma outra tela pode ter salvo antes de redirecionar.
    const alerta = localStorage.getItem("alertaHome");

    // 👉 Se existir algum texto, exibe o alerta e limpa do localStorage.
    if (alerta) {
      // Exibe o alerta como "success" usando o contexto de alertas.
      showAlert(alerta, "success");

      // Remove a chave para não ficar repetindo toda vez que entrar nessa tela.
      localStorage.removeItem("alertaHome");
    }
    // 🔎 Dependências vazias [] ⇒ roda só uma vez quando o componente monta.
  }, [showAlert]);

  // 🔹 useEffect responsável por buscar as métricas reais no Firestore.
  useEffect(() => {
    // ❌ Se o Auth ainda está carregando, não faz nada. Evita query desnecessária.
    if (loading) return;

    // ❌ Se não tem usuário logado, também não faz nada aqui.
    //     A própria tela lá embaixo já trata o caso de user null.
    if (!user) return;

    // 🔹 Função async interna para conseguir usar await.
    const fetchMetrics = async () => {
      try {
        // 👉 Marca que as métricas estão em carregamento.
        setMetricsLoading(true);
        setMetricsError(null);

        // 1️⃣ Query para contar "Projetos em andamento"
        //    - Coleção: "projetos"
        //    - Filtro: status == "em_andamento"
        //    OBS: Se quiser filtrar por usuário, você pode adicionar:
        //         where("userId", "==", user.uid)
        const projetosRef = collection(db, "projetos");
        const projetosQuery = query(
          projetosRef,
          where("status", "==", "em_andamento")
        );
        // 👉 getCountFromServer retorna um snapshot com a contagem sem baixar todos os docs.
        const projetosSnapshot = await getCountFromServer(projetosQuery);
        const projetosCount = projetosSnapshot.data().count || 0;

        // 2️⃣ Query para contar "Propostas pendentes"
        //    - Coleção: "propostas"
        //    - Filtro: status == "pendente"
        const propostasRef = collection(db, "propostas");
        const propostasQuery = query(
          propostasRef,
          where("status", "==", "pendente")
        );
        const propostasSnapshot = await getCountFromServer(propostasQuery);
        const propostasCount = propostasSnapshot.data().count || 0;

        // 3️⃣ Query para contar "Contratos enviados"
        //    - Coleção: "contratos"
        //    - Filtro: status == "enviado"
        const contratosRef = collection(db, "contratos");
        const contratosQuery = query(
          contratosRef,
          where("status", "==", "enviado")
        );
        const contratosSnapshot = await getCountFromServer(contratosQuery);
        const contratosCount = contratosSnapshot.data().count || 0;

        // ✅ Atualiza o estado único de métricas com os valores vindos do Firestore.
        setMetrics({
          projetosEmAndamento: Number(projetosCount),
          propostasPendentes: Number(propostasCount),
          contratosEnviados: Number(contratosCount),
        });
      } catch (error) {
        // ❌ Em caso de erro, loga no console para debug.
        console.error("Erro ao carregar métricas do dashboard:", error);

        // 👉 E atualiza o estado de erro para mostrar algo amigável na UI.
        setMetricsError(
          "Não foi possível carregar os resumos. Tente novamente mais tarde."
        );
      } finally {
        // 👉 Independentemente de sucesso ou erro, marca que terminou o carregamento.
        setMetricsLoading(false);
      }
    };

    // 🔹 Chama a função async que faz as queries.
    fetchMetrics();

    // 🔎 Dependências: quando loading ou user mudarem, essa lógica é reavaliada.
  }, [loading, user]);

  // 🔹 useEffect para tratar redirecionamento após logout (caso você use isLoggingOut).
  useEffect(() => {
    // 👉 Se não há usuário logado E a flag de logout está true, manda pra /login.
    if (!user && isLoggingOut) {
      router.push("/login");
    }
  }, [user, isLoggingOut, router]);

  // 🔹 Enquanto o Auth estiver carregando, mostra apenas uma tela de "Carregando..."
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Carregando...
      </div>
    );
  }

  // 🔹 Se já terminou de carregar e não há usuário logado, mostra mensagem de redirecionamento.
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Redirecionando...
      </div>
    );
  }

  // 🔹 Monta um array de definição dos cards, agora com valores DINÂMICOS.
  const cards = [
    {
      label: "Projetos em andamento", // título do card
      // 👉 Se ainda está carregando, mostra "...". Caso contrário, mostra o número real.
      value: metricsLoading
        ? "..."
        : String(metrics.projetosEmAndamento ?? 0),
      description: "em andamento", // texto secundário
      // ⚠️ OBS: Esse "extra" ainda está estático. Se você quiser, dá pra buscar isso do Firestore também.
      extra: "Resumo baseado nos projetos em aberto",
      action: "Ver projetos", // texto do botão
      route: "/projeto", // rota para onde navegar ao clicar
      icon: faDiagramProject, // ícone do FontAwesome
      color: "#0A478F", // cor de fundo do quadrado do ícone
    },
    {
      label: "Propostas pendentes",
      value: metricsLoading ? "..." : String(metrics.propostasPendentes ?? 0),
      description: "aguardando resposta",
      extra: "Resumo das propostas ainda sem retorno",
      action: "Ver propostas",
      route: "/proposta",
      icon: faFilePen,
      color: "#F38B36",
    },
    {
      label: "Contratos enviados",
      value: metricsLoading ? "..." : String(metrics.contratosEnviados ?? 0),
      description: "este mês", // também pode ser calculado futuramente com filtro por data
      extra: "Contratos já enviados aos clientes",
      action: "Ver contratos",
      route: "/contrato",
      icon: faFileContract,
      color: "#6E2279",
    },
  ];

  // 🔹 Retorno principal do componente (JSX da página).
  return (
    <>
      {/* 🌐 Seção principal com padding e cor de texto branca */}
      <section className="p-6 text-white">
        {/* 👋 Saudação do usuário logado */}
        <div className="bg-gradient-to-r from-[#0A478F]/20 to-[#1e293b]/40 border border-[#334155] rounded-xl p-6 shadow-md mb-10 flex items-center gap-4">
          {/* Emoji com animação */}
          <div className="text-4xl animate-wiggle">👋</div>

          {/* Textos de saudação */}
          <div>
            {/* Mostra o displayName do usuário, ou "usuário" como fallback */}
            <h1 className="text-2xl font-bold mb-1">
              Olá, {user?.displayName ?? "usuário"} !
            </h1>
            <p className="text-gray-400 text-sm">
              Algum cliente novo querendo orçamento ?
            </p>
          </div>
        </div>

        {/* 🔹 Se houve algum erro ao carregar as métricas, exibe uma faixa de alerta básica. */}
        {metricsError && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
            {metricsError}
          </div>
        )}

        {/* 📊 Grid de Cards de resumo */}
        <div className="flex justify-center mb-16">
          {/* Grid responsivo: 1 coluna em telas pequenas, 2 em sm, 3 em lg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Faz o map no array de cards configurados acima */}
            {cards.map((item, index) => (
              // Card individual
              <div
                key={index} // chave única para o React identificar o elemento na lista
                className="card w-96 bg-[#1f2735] p-6 shadow-xl rounded-xl hover:scale-[1.02] transition-transform duration-300"
              >
                {/* Linha com textos à esquerda e ícone à direita */}
                <div className="flex justify-between items-start">
                  {/* Coluna da esquerda: textos */}
                  <div className="flex-1">
                    {/* Título do card */}
                    <p className="text-base text-gray-300">{item.label}</p>

                    {/* Valor principal: número vindo do Firestore ou "..." enquanto carrega */}
                    <h2 className="text-3xl font-bold mt-1">{item.value}</h2>

                    {/* Descrição abaixo do número */}
                    <p className="text-sm text-gray-400 mt-1">
                      {item.description}
                    </p>

                    {/* Texto extra (ainda estático por enquanto) */}
                    <p className="text-sm text-gray-500 mt-4">{item.extra}</p>

                    {/* Botão de ação que leva para a rota correspondente */}
                    <button
                      onClick={() => router.push(item.route)} // navega usando o useRouter do Next
                      className="btn btn-outline btn-primary btn-sm w-full mt-3 flex items-center justify-self-center"
                    >
                      {item.action}
                    </button>
                  </div>

                  {/* Coluna da direita: quadrado colorido com ícone */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center ml-4"
                    style={{ backgroundColor: item.color }} // cor específica para cada card
                  >
                    <FontAwesomeIcon
                      icon={item.icon} // ícone importado do FontAwesome
                      className="text-white text-xl" // cor branca e tamanho do ícone
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ✳️ CTA destacado para criar um novo projeto */}
        <div className="flex justify-self-center items-center card bg-base-100 shadow-2xl border border-base-300 rounded-xl py-8 px-4 text-center max-w-xl mx-auto transition-transform hover:scale-[1.02]">
          <h3 className="text-xl font-semibold mb-4">
            Pronto para iniciar um novo Projeto ?
          </h3>

          {/* Botão que leva para a tela de criação de novo projeto */}
          <button
            onClick={() => router.push("/projeto/novoprojeto")} // rota de novo projeto
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
