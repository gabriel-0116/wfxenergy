"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import AdminRoute from "@/components/AdminRoute";

export default function ListaProdutos() {
  // ------------------------------------------
  // 🔹 Estados principais
  // ------------------------------------------
  const [produtos, setProdutos] = useState<any[]>([]); // todos os produtos vindos do Firestore
  const [filtro, setFiltro] = useState(""); // termo digitado na barra de busca
  const [carregando, setCarregando] = useState(true); // indicador de carregamento
  const router = useRouter();

  // ------------------------------------------
  // 🔹 Função para buscar produtos do Firestore
  // ------------------------------------------
  const buscarProdutos = async () => {
    setCarregando(true);
    try {
      const querySnapshot = await getDocs(collection(db, "produtos"));
      const lista = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProdutos(lista);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setCarregando(false);
    }
  };

  // ------------------------------------------
  // 🔹 Carregar produtos ao abrir a página
  // ------------------------------------------
  useEffect(() => {
    buscarProdutos();
  }, []);

  // ------------------------------------------
  // 🔹 Excluir produto do Firestore
  // ------------------------------------------
  const excluirProduto = async (id: string) => {
    const confirmar = confirm("Tem certeza que deseja excluir este produto?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "produtos", id));
      alert("Produto excluído com sucesso!");
      buscarProdutos(); // recarrega lista
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto.");
    }
  };

  // ------------------------------------------
  // 🔹 Filtra produtos pelo nome digitado
  // ------------------------------------------
  // Quando o usuário digita algo na barra de busca,
  // usamos "toLowerCase()" para deixar a busca insensível a maiúsculas/minúsculas.
  const produtosFiltrados = produtos.filter((produto) =>
    produto.nomeProduto?.toLowerCase().includes(filtro.toLowerCase())
  );

  // ------------------------------------------
  // 🔹 Interface visual (UI)
  // ------------------------------------------
  return (
      <AdminRoute>
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

      {/* Exibição condicional */}
      {carregando ? (
        <p>Carregando produtos...</p>
      ) : produtosFiltrados.length === 0 ? (
        <p>Nenhum produto encontrado.</p>
      ) : (
        // Tabela principal
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
                      onClick={() => router.push(`/produtos/novo?id=${produto.id}`)}
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
    </AdminRoute>
  );
}
