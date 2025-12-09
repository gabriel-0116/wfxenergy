"use client";
// 👆 Diz ao Next.js que esse arquivo é um componente client-side,
//    porque usamos hooks do React e funções do Firebase.

// 🔹 Importações principais do React
import { useEffect, useState } from "react"; 
// 👆 useState: gerenciar estados locais
//    useEffect: rodar efeitos colaterais (ex: buscar dados)

// 🔹 Importações do Firestore
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
// 👆 collection: referência a uma coleção do Firestore
//    getDocs: busca todos os documentos de uma coleção/consulta
//    doc: referência a um documento específico
//    deleteDoc: remove um documento do Firestore

// 🔹 Configuração do Firestore do seu projeto
import { db } from "@/firebase/firebaseConfig"; 
// 👆 `db` é a instância do Firestore que você configurou no firebaseConfig

// 🔹 Utilitários para formatar datas em pt-BR
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// 🔹 Hook de navegação do Next 13+ (App Router)
import { useRouter } from "next/navigation";

// 🔹 Componente de rota protegida SOMENTE para admin
import AdminRoute from "@/components/AdminRoute";

// ------------------------------------------
// 🧩 Tipo opcional para melhorar legibilidade
// ------------------------------------------
interface Produto {
  id: string;
  nomeProduto?: string;
  criadoEm?: { seconds: number };
  totalCusto?: number;
}

// ------------------------------------------
// 🔒 Componente de CONTEÚDO da página
//     (a parte que faz consulta no Firestore)
// ------------------------------------------
function ListaProdutosContent() {
  // ------------------------------------------
  // 🔹 Estados principais
  // ------------------------------------------
  const [produtos, setProdutos] = useState<Produto[]>([]);
  // 👆 Guarda a lista de produtos trazidos do Firestore.
  //    Usamos um tipo `Produto` para documentar o formato esperado.

  const [filtro, setFiltro] = useState("");
  // 👆 Termo digitado na barra de busca para filtrar por nome.

  const [carregando, setCarregando] = useState(true);
  // 👆 Controla o estado de carregamento da lista de produtos.

  const router = useRouter();
  // 👆 Hook do Next para fazer navegação programática (push para outras rotas).

  // ------------------------------------------
  // 🔹 Função para buscar produtos do Firestore
  // ------------------------------------------
  const buscarProdutos = async () => {
    // 👇 Marca como carregando antes de iniciar a requisição.
    setCarregando(true);

    try {
      // 👇 Cria uma referência para a coleção "produtos" no Firestore
      //    e busca todos os documentos dessa coleção.
      const querySnapshot = await getDocs(collection(db, "produtos"));

      // 👇 Converte cada documento em um objeto JS com `id` + dados do doc.
      const lista: Produto[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Produto, "id">),
      }));

      // 👇 Atualiza o estado com a lista trazida do Firestore.
      setProdutos(lista);
    } catch (error) {
      // ❌ Em caso de erro, loga no console para depuração.
      console.error("Erro ao buscar produtos:", error);
      // 👉 Ideal: disparar um toast/alerta para o usuário final.
    } finally {
      // 👇 Independente de sucesso ou erro, marcamos carregando = false.
      setCarregando(false);
    }
  };

  // ------------------------------------------
  // 🔹 Carregar produtos ao abrir a página
  // ------------------------------------------
  useEffect(() => {
    // 👇 Chama a função de buscar produtos apenas uma vez,
    //    quando o componente é montado.
    buscarProdutos();
  }, []);
  // 👆 Dependências vazias: roda só na montagem inicial do componente.

  // ------------------------------------------
  // 🔹 Excluir produto do Firestore
  // ------------------------------------------
  const excluirProduto = async (id: string) => {
    // 👇 Pede confirmação antes de excluir.
    const confirmar = confirm("Tem certeza que deseja excluir este produto?");
    if (!confirmar) return;

    try {
      // 👇 Remove o documento da coleção "produtos" com o ID informado.
      await deleteDoc(doc(db, "produtos", id));

      // 👇 Exibe alerta de sucesso (simples, direto).
      alert("Produto excluído com sucesso!");

      // 👇 Recarrega a lista de produtos para refletir a exclusão.
      buscarProdutos();
    } catch (error) {
      // ❌ Em caso de erro na exclusão, loga e avisa o usuário.
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto.");
    }
  };

  // ------------------------------------------
  // 🔹 Filtra produtos pelo nome digitado
  // ------------------------------------------
  // 👇 Quando o usuário digita na barra de busca,
  //    usamos toLowerCase para deixar case-insensitive.
  const produtosFiltrados = produtos.filter((produto) =>
    produto.nomeProduto?.toLowerCase().includes(filtro.toLowerCase())
  );

  // ------------------------------------------
  // 🔹 Interface visual (UI) da lista de produtos
  // ------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 text-white">
      {/* Cabeçalho da página */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Produtos Cadastrados</h1>

        {/* Barra de busca */}
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="input input-bordered bg-base-100 w-full md:w-72 text-white placeholder-gray-400"
        />

        {/* Botão para criar novo produto */}
        <button
          onClick={() => router.push("/produtos/novo")}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-800 hover:to-indigo-700 transition-all duration-300 shadow-md text-white font-semibold hover:scale-[1.02]"
        >
          Novo Produto
        </button>
      </div>

      {/* Exibição condicional do conteúdo */}
      {carregando ? (
        // 👇 Enquanto estiver buscando os produtos no Firestore.
        <p>Carregando produtos...</p>
      ) : produtosFiltrados.length === 0 ? (
        // 👇 Quando não há produtos para mostrar (lista vazia).
        <p>Nenhum produto encontrado.</p>
      ) : (
        // 👇 Tabela com os produtos filtrados.
        <div className="overflow-x-auto rounded-md border border-gray-600">
          <table className="table w-full text-sm">
            <thead className="bg-base-100 text-white text-center">
              <tr>
                <th>Nome</th>
                <th>Data</th>
                <th>Total Custo</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody className="text-center">
              {produtosFiltrados.map((produto) => (
                <tr key={produto.id} className="hover:bg-base-200">
                  {/* Nome do produto */}
                  <td>{produto.nomeProduto}</td>

                  {/* Data de criação formatada */}
                  <td>
                    {produto.criadoEm?.seconds
                      ? format(
                          new Date(produto.criadoEm.seconds * 1000),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR }
                        )
                      : "---"}
                  </td>

                  {/* Total de custo */}
                  <td>
                    R$ {produto.totalCusto ? produto.totalCusto.toFixed(2) : "0.00"}
                  </td>

                  {/* Botões de ação */}
                  <td className="flex justify-center gap-2">
                    {/* Editar */}
                    <button
                      className="btn btn-sm btn-outline btn-info"
                      onClick={() =>
                        router.push(`/produtos/novo?id=${produto.id}`)
                      }
                    >
                      Editar
                    </button>

                    {/* Excluir */}
                    <button
                      className="btn btn-sm btn-outline btn-error"
                      onClick={() => excluirProduto(produto.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------
// 🔐 Componente de PÁGINA que o Next usa na rota
//     Aqui a gente realmente bloqueia por role
// ------------------------------------------
export default function ListaProdutos() {
  // 👇 Tudo que estiver dentro de <AdminRoute> SÓ é renderizado
  //    se o usuário tiver role permitida (no nosso caso, somente "admin").
  return (
    <AdminRoute>
      {/* 👇 O conteúdo com Firestore só é montado se o AdminRoute liberar. */}
      <ListaProdutosContent />
    </AdminRoute>
  );
}
