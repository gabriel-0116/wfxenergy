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
  const [clienteSelecionado, setClienteSelecionado] = useState<string>(""); // ID do cliente selecionado
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>(""); // ID do projeto selecionado

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
    if (!clienteSelecionado) return;

    const fetchProjetos = async () => {
      const snapshot = await getDocs(
        collection(db, `clientes/${clienteSelecionado}/projetos`)
      );
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjetos(lista);
      setProjetoSelecionado(""); // 🔄 Reseta o projeto se trocar de cliente
    };
    fetchProjetos();
  }, [clienteSelecionado]);

  const handleContinuar = async () => {
    if (!clienteSelecionado || !projetoSelecionado) return;
  
    // 🔍 Busca a subcoleção de precificações
    const precRef = collection(
      db,
      "clientes",
      clienteSelecionado,
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
      `/proposta/gerar-proposta?clienteId=${clienteSelecionado}&projetoId=${projetoSelecionado}&precificacaoId=${precificacaoId}`
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

        {/* 📌 Dropdown de cliente */}
        <div>
          <label className="font-medium">Cliente</label>
          <select
            className="select select-bordered w-full mt-1"
            value={clienteSelecionado}
            onChange={(e) => setClienteSelecionado(e.target.value)}
          >
            <option value="">Selecione um cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nomeCliente || "(sem nome)"} -{" "}
                {cliente.telefone || "sem telefone"}
              </option>
            ))}
          </select>
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
