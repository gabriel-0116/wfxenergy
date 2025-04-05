"use client";
import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function RecuperarSenhaPage() {
  const { resetPassword } = useContext(AuthContext) || {};
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [mensagemErro, setMensagemErro] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword) return;

    const result = await resetPassword(email);

    if (result.success) {
      setStatus("success");
    } else {
      setMensagemErro(result.error || "Erro ao enviar email.");
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-6">Recuperar Senha</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          type="email"
          placeholder="Digite seu email"
          className="w-full p-3 rounded bg-gray-800 border border-gray-600 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded transition"
        >
          Enviar link de recuperação
        </button>
      </form>

      {status === "success" && (
        <p className="mt-4 text-green-400">Email enviado com sucesso! Verifique sua caixa de entrada.</p>
      )}

      {status === "error" && (
        <p className="mt-4 text-red-400">{mensagemErro}</p>
      )}

      <button
        onClick={() => router.push("/login")}
        className="mt-6 text-sm text-blue-400 hover:underline"
      >
        Voltar para o login
      </button>
    </div>
  );
}
