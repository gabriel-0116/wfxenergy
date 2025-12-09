// ✅ AuthProvider.tsx ajustado com loading alinhado com role
"use client";
// 👆 Componente client-side porque usa hooks e APIs do Firebase baseadas em browser.

import React, { useState, useEffect } from "react";
// 👆 React: usamos useState para estados locais e useEffect para efeitos colaterais.

import { AuthContext } from "./AuthContext";
// 👆 Contexto de autenticação que vamos alimentar com user, role, loading, etc.

import { auth } from "../firebase/firebaseConfig";
// 👆 Instância do Firebase Auth configurada no seu projeto.

import { getDocFromServer, setDoc, doc } from "firebase/firestore";
// 👆 getDocFromServer: busca sempre do servidor (sem cache).
//    setDoc: cria/atualiza documento.
//    doc: referência a um documento específico no Firestore.

import { db } from "../firebase/firebaseConfig";
// 👆 Instância do Firestore.

import {
  sendPasswordResetEmail,              // envia email para resetar senha
  createUserWithEmailAndPassword,      // cria usuário com email/senha
  signInWithEmailAndPassword,          // login com email/senha
  signOut as firebaseSignOut,          // logout
  onAuthStateChanged,                  // observa mudanças de autenticação
  User,                                // tipo do usuário do Firebase
  updateProfile,                       // atualiza perfil (ex: displayName)
} from "firebase/auth";

import { SignInResponse } from "../types/types";
// 👆 Tipo próprio que você definiu para respostas de login/cadastro.

interface AuthProviderProps {
  children: React.ReactNode;
}

// 🔐 Componente que envolve toda a aplicação e fornece o contexto de autenticação.
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 👇 Estado para guardar o usuário autenticado (ou null se não logado).
  const [user, setUser] = useState<User | null>(null);

  // 👇 Estado geral de carregamento:
  //    true enquanto estamos determinando se há usuário + qual role ele tem.
  const [loading, setLoading] = useState<boolean>(true);

  // 👇 Estado da role do usuário: "admin", "vendas", "auxiliar", "guest" ou null.
  const [role, setRole] = useState<string | null>(null);

  // ----------------------------------------------------
  // 🔄 1) Observa mudanças de autenticação (login/logout)
  // ----------------------------------------------------
  useEffect(() => {
    // 👇 onAuthStateChanged registra um listener que dispara sempre que:
    //    - usuário loga
    //    - usuário desloga
    //    - sessão é restaurada ao abrir a página
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("👤 AuthStateChanged:", firebaseUser?.email || "Deslogado");

      // 👇 Atualiza o estado de usuário.
      setUser(firebaseUser);

      if (!firebaseUser) {
        // ❌ Se não há usuário logado:
        //    - limpamos role
        //    - marcamos loading como false (já sabemos que está deslogado)
        setRole(null);
        setLoading(false);
      }
      // ✅ Se há usuário logado, NÃO mexemos no loading aqui.
      //    Quem vai terminar o loading é o efeito que busca a role no Firestore.
    });

    // 👇 Remove o listener quando o componente desmontar.
    return () => unsubscribe();
  }, []);
  // 👆 Roda apenas uma vez na montagem do AuthProvider.

  // ----------------------------------------------------
  // 🔄 2) Busca a role do usuário sempre que `user` mudar
  // ----------------------------------------------------
  useEffect(() => {
    // 👇 Se não há usuário (null), garantimos que loading = false e role = null.
    if (!user) {
      // Aqui já tratamos o caso "deslogado" também (redundância segura).
      setRole(null);
      // IMPORTANTE: só setamos loading false aqui se não tem user.
      // Se tiver user, quem controla loading é a função abaixo.
      return;
    }

    // 👇 Função assíncrona interna para buscar role no Firestore.
    const fetchUserRole = async () => {
      try {
        // ⏳ Começamos a buscar a role → loading true.
        setLoading(true);

        // 👇 Referência ao documento do usuário na coleção "users".
        const docRef = doc(db, "users", user.uid);

        // 👇 Busca do servidor para garantir role atualizada (sem cache).
        const docSnap = await getDocFromServer(docRef);

        if (docSnap.exists()) {
          // ✅ Documento encontrado: extraímos os dados.
          const data = docSnap.data() as { role?: string; name?: string; email?: string };

          console.log("🔍 Role do usuário carregado:", data.role);

          // 👇 Se tiver role configurada, usamos; senão, deixamos null.
          setRole(data.role || null);
        } else {
          // ⚠️ Documento não existe no Firestore para esse uid.
          console.warn("⚠️ Documento do usuário não encontrado no Firestore");
          setRole(null);
        }
      } catch (error) {
        // ❌ Qualquer erro buscando a role é logado e a role é zerada.
        console.error("Erro ao buscar role do usuário:", error);
        setRole(null);
      } finally {
        // ✅ Terminamos o processo de descobrir a role:
        //    seja com sucesso ou erro, marcamos loading como false.
        setLoading(false);
      }
    };

    // 👇 Dispara a busca de role quando há usuário logado.
    fetchUserRole();
  }, [user]);
  // 👆 Sempre que o `user` mudar (login/logout/troca de conta), refazemos a regra de role.

  // ----------------------------------------------------
  // 🧩 Função de cadastro (signUp)
  // ----------------------------------------------------
  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<SignInResponse> => {
    try {
      // 👇 Cria usuário no Firebase Auth.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 👇 Atualiza o displayName com o nome fornecido.
      await updateProfile(userCredential.user, { displayName: name });

      // 👇 Cria o doc do usuário na coleção "users" com role inicial "guest".
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role: "guest", // 👈 todo mundo começa como guest até um admin alterar.
      });

      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error.message);
      return { success: false, error: error.message };
    }
  };

  // ----------------------------------------------------
  // 🧩 Função de login (signIn)
  // ----------------------------------------------------
  const signIn = async (
    email: string,
    password: string
  ): Promise<SignInResponse> => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // 👇 O onAuthStateChanged vai cuidar do resto (user, role, loading).
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error("Erro ao logar:", error.message);
      return { success: false, error: error.message };
    }
  };

  // ----------------------------------------------------
  // 🧩 Função de logout (signOut)
  // ----------------------------------------------------
  const signOut = async () => {
    await firebaseSignOut(auth);
    // 👇 O listener do onAuthStateChanged vai detectar e resetar user/role/loading.
  };

  // ----------------------------------------------------
  // 🧩 Função para reset de senha
  // ----------------------------------------------------
  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao enviar email de recuperação:", error.message);
      return { success: false, error: error.message };
    }
  };

  // ----------------------------------------------------
  // 🌐 Provider: expõe user, loading, role e ações para o app todo
  // ----------------------------------------------------
  return (
    <AuthContext.Provider
      value={{ user, loading, role, signUp, signIn, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};
