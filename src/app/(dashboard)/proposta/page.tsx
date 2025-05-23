// 📁 /app/proposta/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export default function PropostaPage() {
  const router = useRouter();

  // 🧠 Estados principais
  const [clientes, setClientes] = useState<any[]>([]); // Lista de clientes
  const [projetos, setProjetos] = useState<any[]>([]); // Lista de projetos do cliente selecionado
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>(""); // ID do projeto selecionado
  const [filtroCliente, setFiltroCliente] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // 🚀 Carrega todos os clientes ao montar o componente
  useEffect(() => {
    const fetchClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"));
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClientes(lista);
    };
    fetchClientes();
  }, []);

  // 🔄 Quando um cliente é selecionado, carrega os projetos dele
  useEffect(() => {
    if (!clienteSelecionado?.id) return;

    const fetchProjetos = async () => {
      const snapshot = await getDocs(
        collection(db, `clientes/${clienteSelecionado.id}/projetos`)
      );
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjetos(lista);
      setProjetoSelecionado("");
    };
    fetchProjetos();
  }, [clienteSelecionado]);

  const handleContinuar = async () => {
    if (!clienteSelecionado || !projetoSelecionado) return;

    // 🔍 Busca a subcoleção de precificações
    const precRef = collection(
      db,
      "clientes",
      clienteSelecionado.id,
      "projetos",
      projetoSelecionado,
      "precificacao"
    );

    const precSnap = await getDocs(precRef);

    if (precSnap.empty) {
      alert("Este projeto ainda não tem dados de precificação.");
      return;
    }

    // 🔁 Pega a mais recente ou a única
    const ultimaPrecificacao = precSnap.docs[precSnap.docs.length - 1];
    const precificacaoId = ultimaPrecificacao.id;

    router.push(
      `/proposta/gerar-proposta?clienteId=${clienteSelecionado.id}&projetoId=${projetoSelecionado}&precificacaoId=${precificacaoId}`
    );
  };
  return (
    <div className="text-white flex justify-center items-center h-[780px] shadow-2xl">
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        {/* 🔖 Cabeçalho da página */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Gerar Proposta</h1>
          <p className="text-gray-500 text-sm">
            Selecione o cliente e o projeto para continuar.
          </p>
        </div>

        {/* 📌 Input de cliente com autocomplete */}
        <div className="relative">
          <label className="font-medium">Cliente</label>
         <input
  type="text"
  placeholder="Digite o nome do cliente"
  className="input input-bordered w-full mt-1"
  value={filtroCliente}
  onChange={(e) => {
    setFiltroCliente(e.target.value);
    setClienteSelecionado(null);
    setProjetoSelecionado("");
    setProjetos([]);
    setMostrarSugestoes(true); // mostra a lista ao digitar
  }}
  onBlur={() => {
    // pequena espera para permitir o clique no item antes de esconder
    setTimeout(() => setMostrarSugestoes(false), 150);
  }}
  onFocus={() => {
    if (filtroCliente) setMostrarSugestoes(true);
  }}
/>


          {/* 🔽 Lista de sugestões de cliente */}
          {mostrarSugestoes && filtroCliente.length > 0 && (
  <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
    {clientes
      .filter((cliente) =>
        cliente.nomeCliente
          ?.toLowerCase()
          .includes(filtroCliente.toLowerCase())
      )
      .map((cliente) => (
        <li
          key={cliente.id}
          className="p-2 hover:bg-base-200 cursor-pointer"
          onClick={() => {
            setClienteSelecionado(cliente);
            setFiltroCliente(cliente.nomeCliente);
            setMostrarSugestoes(false); // oculta a lista após selecionar
          }}
        >
          {cliente.nomeCliente} - {cliente.telefone || "sem telefone"}
        </li>
      ))}
  </ul>
)}

        </div>
        {/* 📌 Dropdown de projeto */}
        {projetos.length > 0 && (
          <div>
            <label className="font-medium">Projeto</label>
            <select
              className="select select-bordered w-full mt-1"
              value={projetoSelecionado}
              onChange={(e) => setProjetoSelecionado(e.target.value)}
            >
              <option value="">Selecione um projeto</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.nomeProjeto || projeto.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 🔘 Botão para continuar */}
        <button
          onClick={handleContinuar}
          disabled={!clienteSelecionado || !projetoSelecionado}
          className="btn btn-primary w-full mt-4"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
