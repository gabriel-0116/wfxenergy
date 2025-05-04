"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc, 
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/firebase/firebaseConfig";
import { IMaskInput } from "react-imask";

export default function NovoProjetoPage() {
  const router = useRouter(); // hook para redirecionar o usuário

  // Estados para os inputs do formulário
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("");
  const searchParams = useSearchParams();

  const clienteIdFromUrl = searchParams.get("clienteId");
const projetoIdFromUrl = searchParams.get("projetoId");
  
  // Estados para autocomplete
  const [sugestoes, setSugestoes] = useState<string[]>([]); // nomes sugeridos
  const [clientes, setClientes] = useState<
    { nomeCliente: string; telefone: string; id: string }[]
  >([]); // clientes completos
  
  const [dadosEditados, setDadosEditados] = useState(false);


  // 🔍 Efeito que roda toda vez que o nome do cliente muda
  useEffect(() => {
    const buscarClientes = async () => {
      if (nomeCliente.length < 1) {
        setSugestoes([]); // se campo vazio, limpa as sugestões
        return;
      }

      // Referência à coleção de clientes no Firestore
      const clientesRef = collection(db, "clientes");

      // Faz uma query buscando todos os clientes (poderia ser otimizado)
      const q = query(clientesRef);
      const querySnapshot = await getDocs(q);

      const resultados: {
        nomeCliente: string;
        telefone: string;
        id: string;
      }[] = [];

      // Percorre cada documento encontrado
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Se o nome do cliente contiver o texto digitado, adiciona à lista de sugestões
        if (
          data.nomeCliente &&
          data.nomeCliente.toLowerCase().includes(nomeCliente.toLowerCase())
        ) {
          resultados.push({
            nomeCliente: data.nomeCliente,
            telefone: data.telefone,
            id: docSnap.id,
          });
        }
      });

      // Atualiza os estados com as sugestões encontradas
      setClientes(resultados); // guarda os clientes para uso posterior
      setSugestoes(resultados.map((c) => c.nomeCliente)); // só os nomes para exibir no dropdown
    };

    buscarClientes(); // executa a busca
  }, [nomeCliente]); // sempre que o nome mudar

  // Quando o usuário clica em uma sugestão
  const handleSelecionarSugestao = (nome: string) => {
    const clienteSelecionado = clientes.find((c) => c.nomeCliente === nome);

    if (clienteSelecionado) {
      setNomeCliente(clienteSelecionado.nomeCliente); // preenche nome
      setTelefone(clienteSelecionado.telefone); // preenche telefone automaticamente
      setSugestoes([]); // limpa sugestões
    }
  };

  // Quando clica no botão "Continuar"
  const handleCriarProjeto = async () => {
    const user = auth.currentUser; // pega o usuário autenticado

    // Validação: impede continuar se nome ou telefone estiverem vazios
    if (!nomeCliente || !telefone || !nomeProjeto.trim()) {
      alert("Por favor, preencha o nome do cliente, telefone e nome do projeto.");
      return;
    }

    if (!user) {
      alert("Usuário não autenticado!");
      return;
    }

    try {
      // Se clienteId e projetoId já vieram pela URL, só redireciona direto
if (clienteIdFromUrl && projetoIdFromUrl && !dadosEditados) {
  router.push(
    `/projeto/novoprojeto/consumo?clienteId=${clienteIdFromUrl}&projetoId=${projetoIdFromUrl}`
  );
  return;
}
      // 1️⃣ Verifica se o cliente já existe no banco

      // Cria uma referência à coleção "clientes"
      const clientesRef = collection(db, "clientes");

      // Faz uma consulta: nome E telefone devem ser exatamente iguais
      const q = query(
        clientesRef,
        where("nomeCliente", "==", nomeCliente),
        where("telefone", "==", telefone)
      );

      // Executa a consulta
      const querySnapshot = await getDocs(q);

      let clienteId: string;

      if (!querySnapshot.empty) {
        // Se encontrou cliente existente, pega o ID dele
        clienteId = querySnapshot.docs[0].id;
      } else {
        // 2️⃣ Se não encontrou, cria um novo cliente
        const novoClienteRef = await addDoc(clientesRef, {
          nomeCliente,
          telefone,
          criadoEm: Timestamp.now(), // adiciona data de criação
        });

        clienteId = novoClienteRef.id; // armazena o ID do novo cliente
      }

      // 3️⃣ Agora cria o projeto dentro da subcoleção "projetos" do cliente

      const projetoRef = await addDoc(
        collection(db, "clientes", clienteId, "projetos"),
        {
          nomeProjeto: nomeProjeto || null,
          criadoEm: Timestamp.now(),
          criadoPor: user.uid,
          ultimaModificacao: Timestamp.now(),
        }
      );

      // 4️⃣ Redireciona para o Step 1, passando clienteId e projetoId via URL
      router.push(
        `/projeto/novoprojeto/consumo?clienteId=${clienteId}&projetoId=${projetoRef.id}`
      );
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      alert("Erro ao criar projeto");
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      // Só tenta buscar se os parâmetros vieram na URL
      if (!clienteIdFromUrl || !projetoIdFromUrl) return;
  
      try {
        // 🔹 Busca os dados do cliente
        const clienteDocRef = doc(db, "clientes", clienteIdFromUrl);
        const clienteSnap = await getDoc(clienteDocRef);
  
        if (clienteSnap.exists()) {
          const clienteData = clienteSnap.data();
          setNomeCliente(clienteData.nomeCliente || "");
          setTelefone(clienteData.telefone || "");
        }
  
        // 🔹 Busca os dados do projeto (opcional, só se quiser preencher o nome)
        const projetoDocRef = doc(
          db,
          "clientes",
          clienteIdFromUrl,
          "projetos",
          projetoIdFromUrl
        );
        const projetoSnap = await getDoc(projetoDocRef);
  
        if (projetoSnap.exists()) {
          const projetoData = projetoSnap.data();
          setNomeProjeto(projetoData.nomeProjeto || "");
        }
      } catch (error) {
        console.error("Erro ao carregar dados do cliente/projeto:", error);
      }
    };
  
    carregarDados();
  }, [clienteIdFromUrl, projetoIdFromUrl]);
  

  return (
    <div className="text-white flex justify-center items-center h-[675px] shadow-2xl">
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        <h2 className="text-2xl font-bold text-center">Novo Projeto</h2>

        {/* Campo de Nome do Cliente com autocomplete */}
        <div className="relative">
          <input
            type="text"
            placeholder="Nome do cliente"
            className="input input-bordered w-full"
            value={nomeCliente}
            onChange={(e) => {
              setNomeCliente(e.target.value);
              setDadosEditados(true);
            }}
            required
          />
          {/* Lista de sugestões (dropdown) */}
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
              {sugestoes.map((nome, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-base-200 cursor-pointer"
                  onClick={() => handleSelecionarSugestao(nome)}
                >
                  {nome}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Campo de telefone */}
        <IMaskInput
          mask="(00) 00000-0000"
          placeholder="Telefone"
          value={telefone}
          className="input input-bordered w-full"
          onAccept={(value: any) => {
            setTelefone(value);
            setDadosEditados(true);
          }}
          required
        />

        {/* Campo opcional de nome do projeto */}
        <input
  type="text"
  placeholder="Nome do projeto"
  className="input input-bordered w-full"
  value={nomeProjeto}
  onChange={(e) => setNomeProjeto(e.target.value)}
  required
/>

        {/* Botão para continuar */}
        <button onClick={handleCriarProjeto} className="btn btn-primary w-full">
          Continuar
        </button>
      </div>
    </div>
  );
}
