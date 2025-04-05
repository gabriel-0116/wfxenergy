"use client";
import { useEffect, useState, useContext } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import AdminRoute from "../../components/AdminRoute";
import { AuthContext } from "../../context/AuthContext";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "AuthContext não encontrado. Verifique se AuthProvider está em volta do app."
    );
  }
  
  const { user } = context;

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData: UserData[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersData.push({
          id: docSnap.id,
          name: data.name,
          email: data.email,
          role: data.role,
        });
      });
      setUsers(usersData);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleChangeRole = async (userId: string, newRole: string) => {
    await updateDoc(doc(db, "users", userId), {
      role: newRole,
    });

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="flex justify-center items-center min-h-screen text-white">
          Carregando usuários...
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="bg-black p-6 text-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Painel do Admin</h1>
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
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 capitalize">{u.role}</td>
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
    </AdminRoute>
  );
}
