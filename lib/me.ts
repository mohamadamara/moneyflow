"use client";

import { useStore } from "./store";
import { useAuth } from "./auth-context";
import type { Member } from "./types";

/** The person using this phone: the signed-in member online, else the first one. */
export function useMe(): Member | undefined {
  const { db } = useStore();
  const auth = useAuth();
  const members = db.household.members;
  return (auth.userId && members.find((m) => m.userId === auth.userId)) || members[0];
}
