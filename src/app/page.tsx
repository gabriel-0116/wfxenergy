"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation"; // ⬅ Importação correta
import { AuthContext } from "../context/AuthContext";

export default function Preload() {
  const { user, loading } = useContext(AuthContext) || {};
  const router = useRouter();
  const pathname = usePathname(); // ⬅ Obtém a rota atual

  useEffect(() => {
    if (!loading) {
      if (user && pathname !== "/home") {
        router.push("/home"); 
      } else if (!user && pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [user, loading, pathname, router]); // ⬅ Atualizando dependências corretamente

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  return null;
}
