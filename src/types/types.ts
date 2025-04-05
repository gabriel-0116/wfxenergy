// src/types/types.ts
import { User } from "firebase/auth";

export interface SignInResponse {
  success: boolean;
  user?: User;
  error?: string;
}
