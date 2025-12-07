// 📁 /app/proposta/page.tsx

"use client"; // 👉 Indica para o Next.js que este componente deve ser renderizado no lado do cliente (necessário para usar hooks como useState, useEffect, useRouter etc.)

import { useEffect, useState } from "react"; // 👉 Importa os hooks básicos do React: useState para estados e useEffect para efeitos colaterais (buscas no Firestore, por exemplo)
import { useRouter } from "next/navigation"; // 👉 Hook do Next.js (App Router) para navegação programática entre páginas
import { collection, getDocs } from "firebase/firestore"; // 👉 Funções do Firestore para acessar coleções e ler documentos
import { db } from "@/firebase/firebaseConfig"; // 👉 Instância do Firestore configurada no seu projeto (arquivo central de configuração do Firebase)

// 👉 Tipo básico para representar um Cliente vindo do Firestore
//    Usei campos que já aparecem no seu código (nomeCliente, telefone).
//    O [key: string]: any mantém flexibilidade para outros campos sem quebrar o TypeScript.
type Cliente = {
  id: string; // 👉 ID do documento do cliente no Firestore
  nomeCliente?: string; // 👉 Nome do cliente (pode estar ausente, então é opcional)
  telefone?: string; // 👉 Telefone do cliente, se existir
  [key: string]: any; // 👉 Índice para permitir outros campos sem precisar tipar tudo agora
};

// 👉 Tipo básico para representar um Projeto vinculado a um cliente
type Projeto = {
  id: string; // 👉 ID do documento do projeto (subcoleção de clientes)
  nomeProjeto?: string; // 👉 Nome do projeto (caso exista esse campo)
  [key: string]: any; // 👉 Outros campos que você tem hoje, mantidos genericamente
};

// 👉 Componente principal da página de seleção para gerar proposta
export default function PropostaPage() {
  const router = useRouter(); // 👉 Hook de navegação para redirecionar o usuário para a próxima tela

  // 🧠 ESTADOS PRINCIPAIS DA TELA

  const [clientes, setClientes] = useState<Cliente[]>([]); // 👉 Lista completa de clientes carregada do Firestore
  const [projetos, setProjetos] = useState<Projeto[]>([]); // 👉 Lista de projetos do cliente selecionado
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null); // 👉 Cliente atualmente selecionado (ou null se nenhum)
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>(""); // 👉 ID do projeto selecionado no <select>
  const [filtroCliente, setFiltroCliente] = useState<string>(""); // 👉 Texto digitado no input de busca de cliente (autocomplete)
  const [mostrarSugestoes, setMostrarSugestoes] = useState<boolean>(false); // 👉 Controla se a lista de sugestões de cliente está visível

  // 🚀 EFEITO: Carrega todos os clientes ao montar o componente
  useEffect(() => {
    // 👉 Função assíncrona interna para poder usar async/await dentro do useEffect
    const fetchClientes = async () => {
      // 👉 Busca todos os documentos da coleção "clientes" no Firestore
      const snapshot = await getDocs(collection(db, "clientes"));

      // 👉 Mapeia cada documento retornado para um objeto Cliente com id + dados
      const lista: Cliente[] = snapshot.docs.map((doc) => ({
        id: doc.id, // 👉 ID do documento
        ...(doc.data() as Omit<Cliente, "id">), // 👉 Spread dos dados do documento, convertidos para o tipo Cliente (menos o id)
      }));

      // 👉 Atualiza o estado com a lista de clientes carregados
      setClientes(lista);
    };

    // 👉 Chama a função que busca os clientes
    fetchClientes();
  }, []); // 👉 Array de dependências vazio: esse efeito roda apenas uma vez, quando o componente é montado

  // 🔄 EFEITO: Quando um cliente é selecionado, carrega os projetos desse cliente
  useEffect(() => {
    // 👉 Se não houver um cliente selecionado ou id indefinido, não faz nada
    if (!clienteSelecionado?.id) return;

    // 👉 Função assíncrona para buscar projetos na subcoleção do cliente
    const fetchProjetos = async () => {
      // 👉 Monta a referência da subcoleção "projetos" do cliente selecionado
      const snapshot = await getDocs(
        collection(db, `clientes/${clienteSelecionado.id}/projetos`)
      );

      // 👉 Converte os documentos em objetos Projeto
      const lista: Projeto[] = snapshot.docs.map((doc) => ({
        id: doc.id, // 👉 ID do projeto
        ...(doc.data() as Omit<Projeto, "id">), // 👉 Dados do projeto
      }));

      // 👉 Atualiza o estado de projetos com a lista encontrada
      setProjetos(lista);

      // 👉 Garante que nenhum projeto fique selecionado se trocarmos de cliente
      setProjetoSelecionado("");
    };

    // 👉 Chama a função que busca os projetos
    fetchProjetos();
  }, [clienteSelecionado]); // 👉 Esse efeito roda sempre que o clienteSelecionado mudar

  // 🎯 Função chamada ao clicar no botão "Continuar"
  const handleContinuar = () => {
    // 👉 Se não houver cliente OU projeto selecionado, simplesmente não faz nada (botão estará desabilitado nesse caso)
    if (!clienteSelecionado || !projetoSelecionado) return;

    // ❗ IMPORTANTE: AQUI É ONDE FIZEMOS A MUDANÇA DE REGRA
    // Antes: você buscava a subcoleção "precificacao" e passava um precificacaoId na URL.
    // Agora: seguindo o novo fluxo, a proposta NÃO depende mais de precificação.
    // Ela vai buscar os dados na tela de "orçamento" (e posteriormente no Firestore).
    // Então, daqui em diante, nós só precisamos mandar clienteId e projetoId.

    // 👉 Redireciona para a página de gerar proposta, passando os parâmetros necessários na query string
    router.push(
      `/proposta/gerar-proposta?clienteId=${clienteSelecionado.id}&projetoId=${projetoSelecionado}`
    );
  };

  // 👉 JSX retornado pelo componente (interface da página)
  return (
    <div className="text-white flex justify-center items-center h-[780px] shadow-2xl">
      {/* 👉 Container central com padding, borda arredondada e sombra */}
      <div className="p-8 rounded-xl shadow-2xl max-w-xl space-y-6 w-full">
        {/* 🔖 Cabeçalho da página */}
        <div className="text-center">
          {/* 👉 Título principal da tela */}
          <h1 className="text-2xl font-bold">Gerar Proposta</h1>
          {/* 👉 Subtítulo explicando o fluxo para o usuário */}
          <p className="text-gray-500 text-sm">
            Selecione o cliente e o projeto para continuar.
          </p>
        </div>

        {/* 📌 Campo de cliente com autocomplete */}
        <div className="relative">
          {/* 👉 Rótulo do campo de cliente */}
          <label className="font-medium">Cliente</label>

          {/* 👉 Input de texto onde o usuário digita o nome do cliente para filtrar */}
          <input
            type="text" // 👉 Tipo texto simples
            placeholder="Digite o nome do cliente" // 👉 Placeholder explicando o que digitar
            className="input input-bordered w-full mt-1" // 👉 Classes de estilo (provavelmente do DaisyUI + Tailwind)
            value={filtroCliente} // 👉 Valor atual do input controlado pelo estado filtroCliente
            onChange={(e) => {
              // 👉 Quando o usuário digita, atualizamos o texto do filtro
              setFiltroCliente(e.target.value);

              // 👉 Resetamos o cliente selecionado, pois o texto mudou e pode não refletir mais o cliente anterior
              setClienteSelecionado(null);

              // 👉 Resetamos o projeto selecionado, já que o cliente também foi limpo
              setProjetoSelecionado("");

              // 👉 Limpamos a lista de projetos exibidos
              setProjetos([]);

              // 👉 Mostramos a lista de sugestões enquanto o usuário digita
              setMostrarSugestoes(true);
            }}
            onBlur={() => {
              // 👉 Quando o input perde o foco, aguardamos um pequeno delay
              //    para permitir que o clique em um item da lista de sugestões
              //    seja registrado antes de esconder a lista
              setTimeout(() => setMostrarSugestoes(false), 150);
            }}
            onFocus={() => {
              // 👉 Quando o campo ganha foco novamente, se já houver texto digitado,
              //    voltamos a mostrar a lista de sugestões
              if (filtroCliente) setMostrarSugestoes(true);
            }}
          />

          {/* 🔽 Lista suspensa com sugestões de clientes filtrados */}
          {mostrarSugestoes && filtroCliente.length > 0 && (
            <ul className="absolute z-10 w-full bg-base-100 shadow-lg rounded-md mt-1 max-h-40 overflow-y-auto">
              {/* 👉 Filtra os clientes cujo nome contém o texto digitado (case-insensitive) e mapeia para <li> */}
              {clientes
                .filter((cliente) =>
                  cliente.nomeCliente
                    ?.toLowerCase()
                    .includes(filtroCliente.toLowerCase())
                )
                .map((cliente) => (
                  <li
                    key={cliente.id} // 👉 Chave única para o React identificar o item na lista
                    className="p-2 hover:bg-base-200 cursor-pointer" // 👉 Estilo visual + hover
                    onClick={() => {
                      // 👉 Quando o usuário clica no item, definimos esse cliente como selecionado
                      setClienteSelecionado(cliente);

                      // 👉 Atualizamos o texto do input para o nome do cliente selecionado
                      setFiltroCliente(cliente.nomeCliente || "");

                      // 👉 Escondemos a lista de sugestões
                      setMostrarSugestoes(false);
                    }}
                  >
                    {/* 👉 Texto que aparece em cada sugestão: nome + telefone (quando existir) */}
                    {cliente.nomeCliente} - {cliente.telefone || "sem telefone"}
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* 📌 Dropdown de seleção de projeto — só aparece se houver projetos carregados */}
        {projetos.length > 0 && (
          <div>
            {/* 👉 Rótulo do campo de projeto */}
            <label className="font-medium">Projeto</label>

            {/* 👉 Select controlado com a lista de projetos do cliente */}
            <select
              className="select select-bordered w-full mt-1" // 👉 Estilização do select
              value={projetoSelecionado} // 👉 Valor atual do select (id do projeto)
              onChange={(e) => setProjetoSelecionado(e.target.value)} // 👉 Atualiza o id do projeto selecionado ao mudar
            >
              {/* 👉 Opção padrão inicial, sem valor */}
              <option value="">Selecione um projeto</option>

              {/* 👉 Mapeia a lista de projetos para opções do select */}
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.id}>
                  {/* 👉 Usa o nome do projeto se existir; caso contrário, mostra apenas o id */}
                  {projeto.nomeProjeto || projeto.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 🔘 Botão de continuar para a próxima etapa (gerar proposta) */}
        <button
          onClick={handleContinuar} // 👉 Ao clicar, chama a função que redireciona para /proposta/gerar-proposta
          disabled={!clienteSelecionado || !projetoSelecionado} // 👉 Desabilita o botão enquanto cliente ou projeto não forem selecionados
          className="btn btn-primary w-full mt-4" // 👉 Estilização do botão (largura total e margem superior)
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
