"use client"; 
// 🔹 Componente client-side (usa hooks do React/Next).

import { useEffect, useState } from "react"; 
// 🔹 Hooks básicos do React: estado e efeitos.

import { useRouter } from "next/navigation"; 
// 🔹 Hook do Next para navegação programática.

import { collection, getDocs } from "firebase/firestore"; 
// 🔹 Funções do Firestore para ler coleções/documentos.

import { db } from "@/firebase/firebaseConfig"; 
// 🔹 Instância configurada do Firestore.

export default function ContratoPage() {
  const router = useRouter(); 
  // 🔹 Controle de navegação (router.push).

  // 🧠 Estados principais da tela
  const [clientes, setClientes] = useState<any[]>([]); 
  // 🔹 Lista de clientes carregados do Firestore.

  const [projetos, setProjetos] = useState<any[]>([]); 
  // 🔹 Lista de projetos do cliente selecionado.

  const [clienteSelecionado, setClienteSelecionado] = useState<string>(""); 
  // 🔹 ID do cliente atualmente selecionado no <select>.

  const [projetoSelecionado, setProjetoSelecionado] = useState<string>(""); 
  // 🔹 ID do projeto selecionado no <select>.

  // ----------------------------------------------------
  // 1) Carregar lista de clientes ao montar a tela
  // ----------------------------------------------------
  useEffect(() => {
    const fetchClientes = async () => {
      // 🔹 Busca todos os documentos da coleção "clientes".
      const snapshot = await getDocs(collection(db, "clientes"));

      // 🔹 Mapeia os docs para um array tipado com id + dados.
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔹 Salva no estado para renderizar no select.
      setClientes(lista);
    };

    // 🔹 Executa a função assíncrona.
    fetchClientes();
  }, []); 
  // 🔹 Array vazio => roda apenas uma vez (montagem do componente).

  // ----------------------------------------------------
  // 2) Quando o cliente mudar, carregar projetos dele
  // ----------------------------------------------------
  useEffect(() => {
    // 🔹 Se nenhum cliente foi selecionado ainda, não faz nada.
    if (!clienteSelecionado) return;

    const fetchProjetos = async () => {
      // 🔹 Referência da subcoleção "projetos" desse cliente.
      const snapshot = await getDocs(
        collection(db, `clientes/${clienteSelecionado}/projetos`)
      );

      // 🔹 Monta array com id + dados de cada projeto.
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔹 Atualiza estado dos projetos.
      setProjetos(lista);

      // 🔹 Reseta projeto selecionado ao trocar de cliente.
      setProjetoSelecionado("");
    };

    // 🔹 Executa a busca.
    fetchProjetos();
  }, [clienteSelecionado]); 
  // 🔹 Roda toda vez que o ID do cliente mudar.

  // ----------------------------------------------------
  // 3) Continuar: pegar o ORÇAMENTO e ir para gerar-contrato
  // ----------------------------------------------------
  const handleContinuar = async () => {
    // 🔹 Validação básica: precisa ter cliente e projeto escolhidos.
    if (!clienteSelecionado || !projetoSelecionado) return;

    // 🔍 Em vez de "precificacao", agora usamos a subcoleção "orcamentos"
    const orcamentosRef = collection(
      db,
      "clientes",
      clienteSelecionado,
      "projetos",
      projetoSelecionado,
      "orcamentos"
    );

    // 🔹 Busca todos os orçamentos desse projeto.
    const orcSnap = await getDocs(orcamentosRef);

    // 🔹 Se não houver nenhum orçamento, não dá pra gerar contrato.
    if (orcSnap.empty) {
      alert("Este projeto ainda não possui nenhum orçamento salvo.");
      return;
    }

    // 🔹 Por simplicidade, usamos o ÚLTIMO documento retornado
    //    (mesmo padrão que você usava para precificação).
    const ultimoOrcamentoDoc = orcSnap.docs[orcSnap.docs.length - 1];

    // 🔹 Esse é o ID do orçamento que vamos usar no contrato.
    const orcamentoId = ultimoOrcamentoDoc.id;

    // 🔁 Redireciona para a tela de geração do contrato
    //    passando clienteId, projetoId e orcamentoId via query string.
    router.push(
      `/contrato/gerar-contrato?clienteId=${clienteSelecionado}&projetoId=${projetoSelecionado}&orcamentoId=${orcamentoId}`
    );
  };

  // ----------------------------------------------------
  // 4) Renderização da tela
  // ----------------------------------------------------
  return (
    <div className="text-white flex justify-center items-center h-[780px] shadow-2xl">
      {/* 🔹 Card principal centralizado */}
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Gerar Contrato</h1>
          <p className="text-gray-500 text-sm">
            Selecione o cliente e o projeto para gerar o contrato.
          </p>
        </div>

        {/* Select de Cliente */}
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

        {/* Select de Projeto (só aparece se tiver projetos carregados) */}
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

        {/* Botão Continuar */}
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
