"use client";

import React from "react";
import { AuthGate } from "@/components/auth-gate";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
