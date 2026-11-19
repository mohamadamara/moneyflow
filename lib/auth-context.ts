"use client";

import { createContext, useContext } from "react";

export interface AuthValue {
  mode: "local" | "supabase";
  email?: string;
  userId?: string;
  signOut?: () => Promise<void>;
  /** Online mode only: a 6-letter code the partner types to join. */
  createInvite?: (memberId?: string) => Promise<string>;
}

export const AuthContext = createContext<AuthValue>({ mode: "local" });

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
