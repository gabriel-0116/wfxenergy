"use client";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDiagramProject,
  faFilePen,
  faFileContract,
  faChartColumn,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useAlert } from "@/context/AlertContext";

export default function HomePage() {
  const { user, signOut, role, loading } = useContext(AuthContext) || {};
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { showAlert } = useAlert();

useEffect(() => {
  const alerta = localStorage.getItem("alertaHome");

  if (alerta) {
    showAlert(alerta, "success");
    localStorage.removeItem("alertaHome");
  }
}, []);

  useEffect(() => {
    if (!user && isLoggingOut) {
      router.push("/login");
    }
  }, [user, isLoggingOut, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Redirecionando...
      </div>
    );
  }

  return (
    <>
      <section className="p-6 text-white">
        {/* Saudação */}
        <div className="bg-gradient-to-r from-[#0A478F]/20 to-[#1e293b]/40 border border-[#334155] rounded-xl p-6 shadow-md mb-10 flex items-center gap-4">
          <div className="text-4xl animate-wiggle">👋</div>
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Olá, {user?.displayName ?? "usuário"} !
            </h1>
            <p className="text-gray-400 text-sm">
              Algum cliente novo querendo orçamento ?
            </p>
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="flex justify-center mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                label: "Projetos em andamento",
                value: "12",
                description: "em andamento",
                extra: "Último projeto criado há 2 dias",
                action: "Ver projetos",
                route: "/projeto",
                icon: faDiagramProject,
                color: "#0A478F",
              },
              {
                label: "Propostas pendentes",
                value: "4",
                description: "aguardando resposta",
                extra: "Tempo médio de resposta: 1 dia",
                action: "Ver propostas",
                route: "/proposta",
                icon: faFilePen,
                color: "#F38B36",
              },
              {
                label: "Contratos enviados",
                value: "3",
                description: "este mês",
                extra: "1 contrato expirando em 5 dias",
                action: "Ver contratos",
                route: "/contrato",
                icon: faFileContract,
                color: "#6E2279",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="card w-96 bg-[#1f2735] p-6 shadow-xl rounded-xl hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-base text-gray-300">{item.label}</p>
                    <h2 className="text-3xl font-bold mt-1">{item.value}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {item.description}
                    </p>
                    <p className="text-sm text-gray-500 mt-4">{item.extra}</p>
                    <button
                      onClick={() => router.push(item.route)}
                      className="btn btn-outline btn-primary btn-sm w-full mt-3 flex items-center justify-self-center"
                    >
                      {item.action}
                    </button>
                  </div>
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center ml-4"
                    style={{ backgroundColor: item.color }}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className="text-white text-xl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA destacada */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl py-8 px-4 shadow-md text-center max-w-xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">
          Pronto para iniciar um novo Projeto ?
          </h3>
          <button
            onClick={() => router.push("/novoprojeto")}
            className="flex items-center justify-self-center gap-2 bg-[#6E2279] hover:bg-[#551861] transition-colors px-6 py-2 rounded-lg text-white font-semibold shadow-md hover:scale-[1.02] duration-300 cursor-pointer"
          >
            <FontAwesomeIcon icon={faPlus} />
            Iniciar
          </button>
        </div>
      </section>
    </>
  );
}
