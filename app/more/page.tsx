"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NAV_MAIN, NAV_MORE, NAV_FOOTER, MOBILE_NAV } from "@/lib/nav";
import { Icon } from "@/components/icon";
import { PageTitle, Card } from "@/components/ui";
import { Avatar } from "@/components/widgets";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

export default function MorePage() {
  const { db } = useStore();
  const auth = useAuth();
  const owner = db.household.members[0];
  // pages already in the bottom bar are not repeated here
  const inBar = new Set(MOBILE_NAV.map((it) => it.href));
  const groups = [
    { title: "الأساسية", items: NAV_MAIN.filter((it) => !inBar.has(it.href)) },
    { title: "أخرى", items: [...NAV_MORE, ...NAV_FOOTER] },
  ];
  return (
    <div>
      <PageTitle title="المزيد" />
      <Link href="/settings" className="tap mb-5 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card active:bg-surface-2">
        <Avatar name={owner?.name ?? "م"} color={owner?.color} size={44} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-bold text-ink">{owner?.name ?? "الحساب"}</p>
          <p className="mt-0.5 truncate text-xs text-muted" dir="auto">
            {db.household.name} · {auth.mode === "supabase" ? auth.email : "وضع تجريبي"}
          </p>
        </div>
        <ChevronLeft size={18} className="text-faint" />
      </Link>
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-faint">{g.title}</p>
            <Card className="divide-y divide-border">
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className="tap flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 active:bg-surface-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    <Icon name={it.icon} size={18} />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink">{it.label}</span>
                  <ChevronLeft size={18} className="text-faint" />
                </Link>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
