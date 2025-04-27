"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faSearch } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";

type Cliente = {
  id: string;
  nome: string;
  cnpjCpf: string;
  telefone: string;
  situacao: "Ativo" | "Inativo";
  tipo: "Pessoa Física" | "Pessoa Jurídica";
};

export default function ClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [termoBusca, setTermoBusca] = useState("");

  // EStado para filtros
  const [situacaoFiltro, setSituacaoFiltro] = useState("");
  const [cpfCnpjFiltro, setCpfCnpjFiltro] = useState("");

  const handleRowClick = (id: string) => {
    irParaDetalhes(id);
  };

  const irParaDetalhes = (id: string) => {
    router.push(`/clientes/dados-do-cliente?id=${id}`);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "clientes"), (snapshot) => {
      const lista: Cliente[] = snapshot.docs.map((doc) => {
        const data = doc.data();
      
        return {
          id: doc.id,
          nome: data.nomeCliente || "Sem nome",
          cnpjCpf: data.tipoPessoa === "PJ" ? data.cnpj || "" : data.cpf || "", // 👈 AQUI
          telefone: data.telefone || "",
          situacao: data.situacao || "Ativo",
          tipo: data.tipoPessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física",
        };
      });
      
      setClientes(lista);
    });

    return () => unsubscribe();
  }, []);

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const excluirSelecionados = async () => {
    const confirmar = confirm(
      "Deseja realmente excluir os clientes selecionados?"
    );
    if (!confirmar) return;
  
    try {
      // para cada cliente selecionado, excluir os projetos e depois o cliente
      for (const id of selecionados) {
        // 1. Deleta os projetos do cliente
        const projetosRef = collection(db, "clientes", id, "projetos");
        const projetosSnap = await getDocs(projetosRef);
        const deletarProjetos = projetosSnap.docs.map((docProjeto) =>
          deleteDoc(docProjeto.ref)
        );
        await Promise.all(deletarProjetos);
  
        // 2. Deleta o próprio cliente
        await deleteDoc(doc(db, "clientes", id));
      }
  
      setSelecionados([]);
    } catch (err) {
      console.error("Erro ao excluir clientes:", err);
      alert("Erro ao excluir os clientes. Tente novamente.");
    }
  };
  

  // Esta função filtra os clientes com base no input de busca principal
  // e nos filtros avançados de situação, tipo e gênero
  const clientesFiltrados = clientes.filter((cliente) => {
    const termo = termoBusca.toLowerCase(); // termo do input principal (nome, telefone, cnpj/cpf)

    // Verifica se o termo aparece em nome, telefone ou cnpj/cpf
    const correspondeBusca =
      cliente.nome.toLowerCase().includes(termo) ||
      cliente.telefone.toLowerCase().includes(termo) ||
      cliente.cnpjCpf.toLowerCase().includes(termo);

    // Verifica se a situação bate com o filtro (se selecionado)
    const correspondeSituacao = situacaoFiltro
      ? cliente.situacao === situacaoFiltro
      : true;

    // Retorna somente clientes que passam por todos os filtros
    return correspondeBusca && correspondeSituacao;
  });

  const toggleTodosSelecionados = () => {
    if (selecionados.length === clientesFiltrados.length) {
      // Já estavam todos selecionados → desmarca todos
      setSelecionados([]);
    } else {
      // Marca todos os clientes filtrados
      const todosIds = clientesFiltrados.map((c) => c.id);
      setSelecionados(todosIds);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-bold">
          Clientes
        </h1>
      </div>

      <div className="mb-4 flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/clientes/dados-do-cliente")}
            className="bg-green-500 text-white font-bold px-4 rounded shadow-[0_4px_0_0_#60bd68] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#60bd68] transition-all duration-150"
          >
            ADICIONAR
          </button>
          <button
            className="bg-neutral-400 hover:bg-red-500 text-white font-bold px-4 rounded shadow-[0_4px_0_0_#756868] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#f70000] transition-all duration-150"
            onClick={excluirSelecionados}
            disabled={selecionados.length === 0}
          >
            Excluir
          </button>
        </div>

        <div className="flex items-center">
          <div className="flex items-center w-96">
            <button className="btn btn-square rounded-r-none">
              <FontAwesomeIcon icon={faSearch} />
            </button>
            <input
              type="text"
              placeholder="Pesquisar"
              className="input input-bordered rounded-l-none"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>

          {/* Dropdown da Busca Avançada */}
          <div className="dropdown dropdown-end mr-4">
            <label
              tabIndex={0}
              className="text-md text-blue-300 hover:text-blue-500 cursor-pointer flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faCaretDown} className="text-white" />
              Busca avançada
            </label>

            {/* Conteúdo do dropdown */}
            <div
              tabIndex={0}
              className="dropdown-content z-[1] card card-compact w-80 p-4 shadow bg-base-200 text-base-content space-y-4"
            >
              {/* Filtro por Situação (Ativo ou Inativo) */}
              <div>
                <label className="label text-sm font-bold">Situação:</label>
                <select
                  className="select select-bordered w-full"
                  value={situacaoFiltro}
                  onChange={(e) => setSituacaoFiltro(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    clientesFiltrados.length > 0 &&
                    selecionados.length === clientesFiltrados.length
                  }
                  onChange={toggleTodosSelecionados}
                  className="checkbox checkbox-sm"
                />
              </th>
              <th>Nº</th>
              <th>Nome</th>
              <th>CNPJ/CPF</th>
              <th>Telefone</th>
              <th>Situação</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente, index) => (
              <tr key={cliente.id} className="hover:bg-base-200">
                <td>
                  <input
                    type="checkbox"
                    checked={selecionados.includes(cliente.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelecionado(cliente.id);
                    }}
                    className="checkbox checkbox-sm"
                  />
                </td>
                <td onClick={() => handleRowClick(cliente.id)}>{index + 1}</td>
                <td onClick={() => handleRowClick(cliente.id)}>
                  {cliente.nome}
                </td>
                <td onClick={() => handleRowClick(cliente.id)}>
                  {cliente.cnpjCpf}
                </td>
                <td onClick={() => handleRowClick(cliente.id)}>
                  {cliente.telefone}
                </td>
                <td onClick={() => handleRowClick(cliente.id)}>
                  <div className="flex items-center gap-2">
                    {/* Span com borda arredondada (círculo), cor baseada na situação */}
                    <span
                      className={`h-3 w-3 rounded-full ${
                        cliente.situacao === "Ativo"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    {/* Texto da situação ao lado do círculo */}
                    <span>{cliente.situacao}</span>
                  </div>
                </td>
                <td onClick={() => handleRowClick(cliente.id)}>
                  {cliente.tipo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
