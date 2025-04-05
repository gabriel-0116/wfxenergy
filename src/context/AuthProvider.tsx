"use client";
import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { auth } from "../firebase/firebaseConfig";
import { getDoc ,setDoc, doc } from "firebase/firestore";
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

  useEffect(() => {
  const fetchUserRole = async () => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRole(data.role || null);
      }
    } else {
      setRole(null);
    }
  };

  fetchUserRole();
}, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Função de SignUp (Cadastro)
  const signUp = async (email: string, password: string, name: string): Promise<SignInResponse> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
      await updateProfile(userCredential.user, { displayName: name });
  
      // 🔹 Salva o usuário no Firestore com role "guest"
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

  // ✅ Ajustando signIn para retornar SignInResponse
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
      return { success: true, user: userCredential.user }; // ✅ Agora retorna um objeto SignInResponse
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      return { success: false, error: error.message }; // ✅ Retorna erro no formato esperado
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
