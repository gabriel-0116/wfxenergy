// ✅ AuthProvider.tsx ajustado com verificação de role atualizada
"use client";

import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { auth } from "../firebase/firebaseConfig";
import { getDoc, setDoc, doc, getDocFromServer } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";
import { SignInResponse } from "../types/types";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [role, setRole] = useState<string | null>(null);

  // ✅ Atualiza o role toda vez que o user mudar
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDocFromServer(docRef); // ✅ força dados atualizados do Firestore

          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("🔍 Role do usuário carregado:", data.role);
            setRole(data.role || null);
          } else {
            console.warn("⚠️ Documento do usuário não encontrado no Firestore");
            setRole(null);
          }
        } catch (error) {
          console.error("Erro ao buscar role do usuário:", error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  // ✅ Controla o estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("👤 AuthStateChanged:", firebaseUser?.email || "Deslogado");
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<SignInResponse> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role: "guest",
      });

      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error.message);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email: string, password: string): Promise<SignInResponse> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error("Erro ao logar:", error.message);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao enviar email de recuperação:", error.message);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};