"use client";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";

export default function HomePage() {
  const { user, signOut, role, loading } = useContext(AuthContext) || {};
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (signOut) {
      setIsLoggingOut(true);
      await signOut();
    }
  };

  useEffect(() => {
    if (!user && isLoggingOut) {
      router.push("/login");
    }
  }, [user, isLoggingOut, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Redirecionando...
      </div>
    );
  }

  return (
    <div>
      {/* Conteúdo da página */}
      <div className="p-6">
        <button onClick={handleLogout} className="btn btn-error">
          Sair
        </button>

        {role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="btn btn-primary ml-4"
          >
            Ir para o Painel Admin
          </button>
        )}
      </div>
    </div>
  );
}
