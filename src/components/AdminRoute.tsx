"use client";
// 👆 Componente client-side porque usa hooks.

import { useContext, useEffect, useState } from "react"; // hooks do React
import { useRouter } from "next/navigation"; // redireciono no App Router
import { AuthContext } from "../context/AuthContext"; // seu contexto de auth

interface AdminRouteProps {
  children: React.ReactNode; // conteúdo que só admin pode ver
}

export default function AdminRoute({ children }: AdminRouteProps) {
  // 👇 Pega user, loading e role do contexto de autenticação.
  const { user, loading, role } = useContext(AuthContext) || {};

  const router = useRouter();

  // 👇 Flag interna pra saber se ainda estamos verificando permissão.
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    console.log("🔍 AdminRoute:", { user, role, loading });

    // ⏳ Enquanto o AuthProvider ainda está carregando, não decide nada.
    if (loading) return;

    // ❌ Se não tem usuário logado, manda pro login.
    if (!user) {
      router.replace("/login");
      return;
    }

    // ❌ Se a role NÃO for "admin", bloqueia.
    if (role !== "admin") {
      router.replace("/sem-permissao");
      return;
    }

    // ✅ Se chegou aqui: user existe e é admin.
    setVerifying(false);
  }, [user, role, loading, router]);

  // 👇 Enquanto estiver carregando auth ou checando permissão, mostra uma tela de "espera".
  if (loading || verifying) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Verificando permissões...
      </div>
    );
  }

  // ✅ Se é admin, renderiza o conteúdo normalmente.
  return <>{children}</>;
}
