"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  CircleX,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getActivityFeed,
  type ActivityEvent,
  type ActivityEventType,
} from "@/lib/api/dashboard";

const REFRESH_MS = 30 * 1000;
const LIMIT = 20;

const EVENT_META: Record<
  ActivityEventType,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  booking_completed: {
    icon: CheckCircle2,
    tone: "bg-emerald-100 text-emerald-700",
  },
  booking_new: { icon: CalendarPlus, tone: "bg-blue-100 text-blue-700" },
  booking_cancelled: { icon: CircleX, tone: "bg-red-100 text-red-700" },
  membership_purchased: {
    icon: Sparkles,
    tone: "bg-purple-100 text-purple-700",
  },
  membership_expired: { icon: Sparkles, tone: "bg-amber-100 text-amber-700" },
  customer_registered: { icon: UserPlus, tone: "bg-primary/10 text-primary" },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export function ActivityFeedSection() {
  const { storeId } = useDashboardFilters();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshAt, setRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () => {
      getActivityFeed({ store_id: storeId, limit: LIMIT })
        .then((res) => {
          if (!cancelled) {
            setEvents(res.events);
            setError(null);
            setRefreshAt(new Date());
          }
        })
        .catch((err: unknown) => {
          if (!cancelled)
            setError(err instanceof Error ? err.message : "Gagal memuat data");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    setLoading(true);
    load();
    timer = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [storeId]);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-col items-start gap-1 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 shrink-0 text-indigo-600" />
          Aktivitas terbaru
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {refreshAt
            ? `Diperbarui ${formatRelative(refreshAt.toISOString())}`
            : "Live"}
        </span>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Belum ada aktivitas.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {events.map((evt) => {
              const meta = EVENT_META[evt.type];
              const Icon = meta?.icon ?? Activity;
              return (
                <li key={evt.id} className="flex items-start gap-3 py-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      meta?.tone ?? "bg-muted",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{evt.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {evt.subtitle}
                    </p>
                    {evt.is_early_renewal ? (
                      <Badge
                        variant="outline"
                        className="mt-1 gap-1 border-purple-300 bg-purple-50 text-[10px] text-purple-700"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Early renewal — perk applied
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    {evt.amount && evt.amount > 0 ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-border/60 text-[10px]"
                      >
                        <CircleDollarSign className="h-2.5 w-2.5" />
                        {formatPrice(evt.amount)}
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatRelative(evt.timestamp)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
