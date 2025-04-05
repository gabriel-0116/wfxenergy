"use client"; // ⬅ Adicionado para forçar o uso no lado do cliente

import React, { createContext } from 'react';
import { User } from 'firebase/auth';
import { SignInResponse } from "../types/types"

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  signUp: (email: string, password: string, name: string) => Promise<SignInResponse>;
  signIn: (email: string, password: string) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
