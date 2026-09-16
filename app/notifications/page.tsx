"use client";

import { useStore } from "@/lib/store";
import { relativeDay } from "@/lib/format";
import { PageTitle, Card, Button, EmptyState, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { AppNotification } from "@/lib/types";

const CAT: Record<AppNotification["category"], { icon: string; label: string; color: string }> = {
  bills: { icon: "Receipt", label: "الفواتير", color: "#ef4444" },
  budgets: { icon: "PieChart", label: "الميزانيات", color: "#b54708" },
  transactions: { icon: "ArrowLeftRight", label: "المعاملات", color: "#4f46e5" },
  savings: { icon: "Target", label: "الادخار", color: "#067647" },
  household: { icon: "Users", label: "الأسرة", color: "#0ea5e9" },
  system: { icon: "Settings", label: "النظام", color: "#64748b" },
};

export default function NotificationsPage() {
  const { db, ready, markNotificationRead, markAllRead } = useStore();
  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;
  const unread = db.notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageTitle
        title="التنبيهات"
        sub={unread > 0 ? `${unread} غير مقروءة` : "لا تنبيهات جديدة"}
        action={unread > 0 ? <Button variant="outline" onClick={markAllRead}>تعليم الكل كمقروء</Button> : undefined}
      />

      {db.notifications.length === 0 ? (
        <Card><EmptyState title="لا تنبيهات" desc="ستظهر هنا تنبيهات الفواتير والميزانيات وأهداف الادخار." /></Card>
      ) : (
        <div className="space-y-2">
          {db.notifications.map((n) => {
            const c = CAT[n.category];
            return (
              <Card key={n.id} className={`flex items-center gap-3 p-4 ${n.read ? "opacity-70" : ""}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: c.color + "22", color: c.color }}>
                  <Icon name={c.icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="text-xs text-muted">{c.label} · {relativeDay(n.at)}</p>
                </div>
                {!n.read && (
                  <button onClick={() => markNotificationRead(n.id)} className="text-xs font-semibold text-brand hover:underline">
                    تعليم كمقروء
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
