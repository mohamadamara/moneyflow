"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Wallet } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { resolveHouseholdId } from "@/lib/supabase/repo";
import { AuthContext } from "@/lib/auth-context";
import { StoreProvider } from "@/lib/store";
import { SupabaseStoreProvider } from "@/lib/store-supabase";
import { UIProvider } from "./quick-add";
import { Shell } from "./shell";
import { AuthScreen } from "./auth-screen";
import { Onboarding } from "./onboarding";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-brand text-white">
          <Wallet size={22} />
        </div>
        <p className="text-sm text-muted">جارٍ التحميل…</p>
      </div>
    </div>
  );
}

// Local (demo) tree — no auth.
function LocalApp({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ mode: "local" }}>
      <StoreProvider>
        <UIProvider>
          <Shell>{children}</Shell>
        </UIProvider>
      </StoreProvider>
    </AuthContext.Provider>
  );
}

type Phase = "loading" | "auth" | "onboarding" | "ready";

function SupabaseApp({ sb, children }: { sb: SupabaseClient; children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("أنا");

  useEffect(() => {
    let active = true;

    async function evaluate() {
      const { data } = await sb.auth.getSession();
      if (!active) return;
      const user = data.session?.user;
      if (!user) {
        setPhase("auth");
        return;
      }
      setEmail(user.email ?? "");
      setDisplayName((user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "أنا");
      const hid = await resolveHouseholdId(sb);
      if (!active) return;
      if (hid) {
        setHouseholdId(hid);
        setPhase("ready");
      } else {
        setPhase("onboarding");
      }
    }

    evaluate();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setHouseholdId(null);
        setPhase("auth");
      } else {
        evaluate();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  const signOut = async () => {
    await sb.auth.signOut();
  };

  if (phase === "loading") return <Splash />;
  if (phase === "auth") return <AuthScreen sb={sb} />;
  if (phase === "onboarding")
    return (
      <Onboarding
        sb={sb}
        defaultName={displayName}
        onDone={(id) => {
          setHouseholdId(id);
          setPhase("ready");
        }}
      />
    );

  return (
    <AuthContext.Provider value={{ mode: "supabase", email, signOut }}>
      <SupabaseStoreProvider sb={sb} householdId={householdId!}>
        <UIProvider>
          <Shell>{children}</Shell>
        </UIProvider>
      </SupabaseStoreProvider>
    </AuthContext.Provider>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const sb = useMemo(() => getSupabaseBrowser(), []);
  if (!sb) return <LocalApp>{children}</LocalApp>;
  return <SupabaseApp sb={sb}>{children}</SupabaseApp>;
}
