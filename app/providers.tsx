"use client";

import React from "react";
import { StoreProvider } from "@/lib/store";
import { UIProvider } from "@/components/quick-add";
import { Shell } from "@/components/shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <UIProvider>
        <Shell>{children}</Shell>
      </UIProvider>
    </StoreProvider>
  );
}
