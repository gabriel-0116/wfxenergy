"use client";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import ProtectedRoute from "../../components/ProtectedRoute";
import Sidebar from "@/components/SideBar";
import Header from "../../components/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, role, loading } = useContext(AuthContext) || {};
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    <ProtectedRoute>
      <div className="flex bg-[#212325]">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
