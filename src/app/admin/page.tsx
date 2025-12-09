"use client";
// 👆 Esse componente roda no lado do cliente porque usa hooks do React e do Next,
//    além das funções do Firebase que dependem de browser.

import { useEffect, useState } from "react";
// 👆 useState: para gerenciar os estados locais (users, loading).
//    useEffect: para buscar os usuários no Firestore quando o componente montar.

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
// 👆 Funções do Firestore:
//    - collection: referencia uma coleção (ex: "users").
//    - getDocs: busca todos os documentos de uma coleção/consulta.
//    - updateDoc: atualiza campos de um documento existente.
//    - doc: cria a referência de um documento específico pelo ID.

import { db } from "../../firebase/firebaseConfig";
// 👆 Instância do Firestore já configurada no seu projeto.

import AdminRoute from "../../components/AdminRoute";
// 👆 Componente de proteção: só permite acesso se a role do usuário for "admin".
//    Qualquer coisa dentro de <AdminRoute> só vai ser renderizada se o usuário for admin.

// 🔹 Tipo para representar os dados de usuário que vamos exibir no painel.
interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ----------------------------------------------------------
// 🔒 Componente de CONTEÚDO do painel admin
//     (é aqui que tem Firestore, estados, useEffect, etc.)
//     Esse componente só será montado se o AdminRoute liberar.
// ----------------------------------------------------------
function AdminPanelContent() {
  // 👇 Estado que guarda a lista de usuários vinda do Firestore.
  const [users, setUsers] = useState<UserData[]>([]);

  // 👇 Estado de loading apenas para o carregamento da lista de usuários.
  const [loading, setLoading] = useState(true);

  // 🔄 Efeito que busca todos os usuários da coleção "users" quando o componente monta.
  useEffect(() => {
    // 👇 Função assíncrona interna para buscar os dados.
    const fetchUsers = async () => {
      try {
        // 👇 Busca todos os documentos da coleção "users".
        const querySnapshot = await getDocs(collection(db, "users"));

        // 👇 Monta um array tipado com os dados dos usuários.
        const usersData: UserData[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as { name: string; email: string; role: string };

          usersData.push({
            id: docSnap.id,   // ID do documento no Firestore
            name: data.name,  // Nome do usuário
            email: data.email, // Email do usuário
            role: data.role,   // Role atual (admin, vendas, auxiliar, etc.)
          });
        });

        // 👇 Atualiza o estado com a lista preparada.
        setUsers(usersData);
      } catch (error) {
        // ❌ Em caso de erro, loga no console (ideal: tratar com toast na UI depois).
        console.error("Erro ao buscar usuários para o painel admin:", error);
      } finally {
        // 👇 Independentemente de sucesso ou erro, marcamos loading como false.
        setLoading(false);
      }
    };

    // 👇 Chama a função assim que o componente monta.
    fetchUsers();
  }, []); 
  // 👆 Array de dependências vazio: esse useEffect roda apenas uma vez na montagem.

  // 🔧 Função para alterar a role de um usuário específico.
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      // 👇 Atualiza o campo "role" do documento correspondente no Firestore.
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
      });

      // 👇 Atualiza a lista local de usuários para refletir a mudança instantaneamente na tela.
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      // ❌ Em caso de erro ao atualizar a role, loga o erro.
      console.error("Erro ao alterar role do usuário:", error);
      // 👉 Ideal: mostrar um alerta/toast para o usuário final aqui.
    }
  };

  // 🔄 Se ainda estamos carregando a lista de usuários, mostramos um feedback visual.
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Carregando usuários...
      </div>
    );
  }

  // ✅ Conteúdo principal do painel admin (tabela de usuários e ações de alterar role).
  return (
    <div className="bg-black p-6 text-white max-w-4xl mx-auto">
      {/* Título da página */}
      <h1 className="text-3xl font-bold mb-6">Painel do Admin</h1>

      {/* Tabela com usuários e ações */}
      <table className="w-full text-left border border-white/20">
        <thead>
          <tr className="bg-white/10">
            <th className="p-3">Nome</th>
            <th className="p-3">Email</th>
            <th className="p-3">Função</th>
            <th className="p-3">Ações</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-white/10">
              {/* Nome do usuário */}
              <td className="p-3">{u.name}</td>

              {/* Email do usuário */}
              <td className="p-3">{u.email}</td>

              {/* Role atual, com primeira letra maiúscula na exibição (className capitalize) */}
              <td className="p-3 capitalize">{u.role}</td>

              {/* Botões para alterar role */}
              <td className="p-3 flex gap-2">
                <button
                  onClick={() => handleChangeRole(u.id, "vendas")}
                  className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                >
                  Vendas
                </button>

                <button
                  onClick={() => handleChangeRole(u.id, "auxiliar")}
                  className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm"
                >
                  Auxiliar
                </button>

                <button
                  onClick={() => handleChangeRole(u.id, "admin")}
                  className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700 text-sm"
                >
                  Admin
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------------------------------------
// 🌐 Componente de PÁGINA (default export)
//     Aqui SIM usamos o AdminRoute, e somente aqui.
//     Tudo dentro de <AdminRoute> só é renderizado se o usuário for admin.
//     Se for "vendas" ou qualquer outra role, ele é redirecionado ANTES
//     do AdminPanelContent ser montado (ou seja, sem rodar Firestore para ele).
// ----------------------------------------------------------
export default function AdminPage() {
  return (
    <AdminRoute>
      {/* 👇 Conteúdo que só o admin pode ver */}
      <AdminPanelContent />
    </AdminRoute>
  );
}
