"use client";
import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";

export default function RegisterPage() {
  const { signUp, user } = useContext(AuthContext) || {};
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Redirecionamento dentro do useEffect para evitar erro
  useEffect(() => {
    if (user) {
      router.push("/home");
    }
  }, [user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    const result = await signUp(email, password, name);

    if (result?.success) {
      router.push("/home"); // Redireciona após o cadastro bem-sucedido
    } else {
      setError(result?.error || "Erro ao criar conta.");
    }
  };

  return (
     <div className="flex h-screen">
          {/* 🔹 Imagem de fundo */}
          <div className="absolute inset-0">
            <Image
              src="/bg.jpg"
              alt="Background"
              layout="fill"
              objectFit="cover"
              className="w-full h-full"
            />
            {/* 🔹 Overlay escuro para contraste */}
            <div className="absolute inset-0 bg-black opacity-50"></div>
          </div>
    
          {/* 🔹 Container do login */}
          <div className="relative z-10 flex flex-col justify-between w-2xl h-screen border-r border-white backdrop-blur-md p-10">
            <div className="absolute inset-0 bg-white opacity-10 pointer-events-none"></div>
            {/* 🔹 Logo no topo */}
            <div className="flex justify-center">
              <Image src="/logo.png" alt="Logo" width={200} height={50} />
            </div>
    
            {/* 🔹 Conteúdo centralizado */}
            <div className="flex flex-col items-center mx-16">
              <h2 className="text-2xl font-bold text-center text-white mb-10 drop-shadow-lg">
                Faça seu Cadastro
              </h2>
              {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg w-full">{error}</p>}
    
              <form onSubmit={handleRegister} className="w-96 space-y-4 mt-10">
                {/* Campo de Registro */}
                <div className="relative mb-4">
                  <FontAwesomeIcon
                    icon={faUser}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Nome"
                    className="w-full px-12 py-3 bg-transparent border-b border-gray-300 text-white placeholder-gray-400 focus:outline-none focus:border-[#6E2279] transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                {/* 🔹 Campo de Email */}
                <div className="relative mb-4">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-12 py-3 bg-transparent border-b border-gray-300 text-white placeholder-gray-400 focus:outline-none focus:border-[#6E2279] transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
    
                {/* 🔹 Campo de Senha */}
                <div className="relative mb-6">
                  <FontAwesomeIcon
                    icon={faLock}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    className="w-full px-12 py-3 bg-transparent border-b border-gray-300 text-white placeholder-gray-400 focus:outline-none focus:border-[#6E2279] transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-all hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
    
                {/* 🔹 Botão de Entrar */}
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="w-48 mt-8 bg-gradient-to-r from-[#0A478F] via-[#044896] via-50% text-white py-3 rounded-full shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
    
            {/* 🔹 Link para Cadastro */}
            <div className="mb-6 flex justify-center text-center items-center text-white">
              <p className="text-md">Já tem conta ?</p>
              <button
                onClick={() => router.push("/login")}
                className="ml-1 text-[#F38B36] font-semibold text-lg hover:underline"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
  );
}
