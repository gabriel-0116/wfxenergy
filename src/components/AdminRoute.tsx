"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "../context/AuthContext";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const auth = useContext(AuthContext);
  const router = useRouter();

  // Se seu provider às vezes retorna null/undefined, trate isso explicitamente
  const user = auth?.user;
  const role = auth?.role;
  const loading = auth?.loading ?? true;

  // Redirecionamentos (efeitos colaterais) ficam no useEffect
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (role !== "admin") {
      router.replace("/sem-permissao");
      return;
    }
  }, [loading, user, role, router]);

  // UI é derivada do estado atual (sem setState inútil)
  const allowed = !loading && !!user && role === "admin";

  if (!allowed) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Verificando permissões...
      </div>
    );
  }

  return <>{children}</>;
}
