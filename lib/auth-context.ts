"use client";

import { createContext, useContext } from "react";

export interface AuthValue {
  mode: "local" | "supabase";
  email?: string;
  signOut?: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue>({ mode: "local" });

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
