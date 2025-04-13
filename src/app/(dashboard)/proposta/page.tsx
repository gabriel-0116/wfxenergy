// ✅ Página: /proposta/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export default function PropostaPage() {
  const router = useRouter();

  // Estados para armazenar clientes, projetos e seleções
  const [clientes, setClientes] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("");

  // Carrega todos os clientes ao montar o componente
  useEffect(() => {
    const fetchClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"));
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClientes(lista);
    };
    fetchClientes();
  }, []);

  // Quando o cliente é selecionado, carrega os projetos
  useEffect(() => {
    if (!clienteSelecionado) return;

    const fetchProjetos = async () => {
      const snapshot = await getDocs(
        collection(db, `clientes/${clienteSelecionado}/projetos`)
      );
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProjetos(lista);
      setProjetoSelecionado(""); // reseta projeto anterior se mudar cliente
    };
    fetchProjetos();
  }, [clienteSelecionado]);

  // Ao clicar em continuar, redireciona para a tela /gerar-proposta
  const handleContinuar = () => {
    if (!clienteSelecionado || !projetoSelecionado) return;
    router.push(
      `/proposta/gerar-proposta?clienteId=${clienteSelecionado}&projetoId=${projetoSelecionado}`
    );
  };

  return (
    <div className="text-white flex justify-center items-center h-[780px] shadow-2xl">
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Gerar Proposta</h1>
          <p className="text-gray-500 text-sm">
            Selecione o cliente e o projeto para continuar.
          </p>
        </div>

        {/* Seletor de Cliente */}
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
                {cliente.nomeCliente || "(sem nome)"} - {cliente.telefone || "sem telefone"}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Projeto */}
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

        {/* Botão de continuar */}
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
