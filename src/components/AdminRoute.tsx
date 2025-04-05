"use client";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "../context/AuthContext";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, role } = useContext(AuthContext) || {};
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    console.log("verificando admin:", { user, role, loading });
  
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "admin") {
        router.push("/login");
      } else {
        setVerifying(false);
      }
    }
  }, [user, role, loading, router]);
  
  if (loading || verifying) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Verificando permissões...
      </div>
    );
  }

  return <>{children}</>;
}
