"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NAV, NAV_FOOTER } from "@/lib/nav";
import { Icon } from "@/components/icon";
import { PageTitle, Card } from "@/components/ui";

export default function MorePage() {
  const groups = [...NAV, { title: "أخرى", items: NAV_FOOTER }];
  return (
    <div>
      <PageTitle title="المزيد" />
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-faint">{g.title}</p>
            <Card className="divide-y divide-border">
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted">
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
