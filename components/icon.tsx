"use client";

import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

// Render a lucide icon by its string name (with a safe fallback).
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? Lucide.Circle;
  return <Cmp {...props} />;
}
