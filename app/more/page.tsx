"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MORE } from "@/lib/nav";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/widgets";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

export default function MorePage() {
  const { db } = useStore();
  const auth = useAuth();
  const members = db.household.members;
  return (
    <div className="space-y-4">
      <Link href="/settings" className="tap flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card">
        <div className="flex -space-x-3 space-x-reverse">
          {members.slice(0, 3).map((m) => (
            <span key={m.id} className="rounded-full ring-2 ring-surface">
              <Avatar name={m.name} color={m.color} size={44} />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-bold text-ink">{members.map((m) => m.name).join(" و ") || "الحساب"}</p>
          <p className="mt-1 truncate text-xs text-muted" dir="auto">
            {auth.mode === "supabase" ? auth.email : "محفوظ على هذا الهاتف"}
          </p>
        </div>
        <ChevronLeft size={18} className="text-faint" />
      </Link>

      <Card className="divide-y divide-border px-2">
        {MORE.map((it) => (
          <Link key={it.href} href={it.href} className="tap flex items-center gap-3 px-2 py-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Icon name={it.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-ink">{it.label}</span>
              {it.hint && <span className="block truncate text-xs text-muted">{it.hint}</span>}
            </span>
            <ChevronLeft size={18} className="text-faint" />
          </Link>
        ))}
      </Card>
    </div>
  );
}
