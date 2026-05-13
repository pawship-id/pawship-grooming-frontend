"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getNeedsAction,
  type IdlePetItem,
  type MembershipEndingItem,
  type NeedFollowUpItem,
  type NeedsActionResponse,
} from "@/lib/api/dashboard";

const MAX_ITEMS = {
  membership: 3,
  idle: 3,
  followUp: 5,
};

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function NeedsActionSection() {
  const [data, setData] = useState<NeedsActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getNeedsAction()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Perlu Tindakan
        </CardTitle>
        <span className="text-xs text-muted-foreground">Global</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <MembershipEndingBlock
          loading={loading}
          items={data?.membershipEnding.items ?? []}
          total={data?.membershipEnding.total ?? 0}
        />
        <IdlePetsBlock
          loading={loading}
          items={data?.idlePets.items ?? []}
          total={data?.idlePets.total ?? 0}
        />
        <NeedFollowUpBlock
          loading={loading}
          items={data?.needFollowUp.items ?? []}
          total={data?.needFollowUp.total ?? 0}
        />
      </CardContent>
    </Card>
  );
}

function SectionFrame({
  icon,
  title,
  count,
  children,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
  tone: "amber" | "red" | "primary";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 border-amber-200"
      : tone === "red"
        ? "bg-red-50 border-red-200"
        : "bg-primary/5 border-primary/20";
  return (
    <div className={cn("rounded-lg border p-4", toneClass)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          {icon}
          {title}
        </div>
        <Badge variant="outline" className="bg-background">
          {count}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-background p-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function MembershipEndingBlock({
  loading,
  items,
  total,
}: {
  loading: boolean;
  items: MembershipEndingItem[];
  total: number;
}) {
  const shown = items.slice(0, MAX_ITEMS.membership);
  const remaining = total - shown.length;

  return (
    <SectionFrame
      icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
      title="Membership berakhir bulan ini"
      count={total}
      tone="amber"
    >
      {loading ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <EmptyRow label="Tidak ada membership yang akan berakhir bulan ini." />
      ) : (
        <ul className="space-y-2">
          {shown.map((it) => (
            <li
              key={`${it.pet_id}-${it.expiry_date}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {it.pet_name}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {it.customer_name}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {it.tier} · exp {formatDate(it.expiry_date)} ·{" "}
                  {it.days_remaining} hari
                </p>
              </div>
              <Badge
                variant={it.urgency === "critical" ? "destructive" : "default"}
                className={cn(
                  it.urgency === "upcoming" &&
                    "bg-amber-100 text-amber-800 hover:bg-amber-100",
                )}
              >
                {it.urgency === "critical" ? "Critical" : "Upcoming"}
              </Badge>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="text-right text-xs">
              <Link
                href="/admin/pet-memberships?status=active&expiring=this-month"
                className="text-primary hover:underline"
              >
                +{remaining} lainnya — Lihat semua
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </SectionFrame>
  );
}

function IdlePetsBlock({
  loading,
  items,
  total,
}: {
  loading: boolean;
  items: IdlePetItem[];
  total: number;
}) {
  const shown = items.slice(0, MAX_ITEMS.idle);
  const remaining = total - shown.length;

  return (
    <SectionFrame
      icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
      title="Idle — tidak ada kunjungan 30+ hari"
      count={total}
      tone="red"
    >
      {loading ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <EmptyRow label="Tidak ada pet yang idle." />
      ) : (
        <ul className="space-y-2">
          {shown.map((it) => (
            <li
              key={it.pet_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {it.pet_name}
                  {it.breed ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {it.breed}
                    </span>
                  ) : null}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {it.customer_name}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Last visit {formatDate(it.last_visit_at)} · {it.days_since}{" "}
                  hari
                </p>
              </div>
              <Badge variant="destructive">{it.days_since}d</Badge>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="text-right text-xs">
              <Link
                href="/admin/users?filter=idle-pets"
                className="text-primary hover:underline"
              >
                +{remaining} lainnya — Lihat semua
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </SectionFrame>
  );
}

function NeedFollowUpBlock({
  loading,
  items,
  total,
}: {
  loading: boolean;
  items: NeedFollowUpItem[];
  total: number;
}) {
  const shown = items.slice(0, MAX_ITEMS.followUp);
  const remaining = total - shown.length;

  return (
    <SectionFrame
      icon={<MessageCircle className="h-4 w-4 text-primary" />}
      title="Follow-up — kunjungan ke-1 atau ke-2 selesai (24 jam)"
      count={total}
      tone="primary"
    >
      {loading ? (
        <SkeletonRows count={4} />
      ) : items.length === 0 ? (
        <EmptyRow label="Belum ada follow-up dalam 24 jam terakhir." />
      ) : (
        <ul className="space-y-2">
          {shown.map((it) => (
            <li
              key={it.booking_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {it.pet_name}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {it.customer_name}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {it.service_name}
                  {it.groomer_name ? ` · ${it.groomer_name}` : ""} ·{" "}
                  {formatRelativeTime(it.completed_at)}
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1 border-primary/40 text-primary"
              >
                <Sparkles className="h-3 w-3" />
                {it.visit_tag === "1st" ? "1st visit" : "2nd visit"}
              </Badge>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="text-right text-xs text-muted-foreground">
              +{remaining} lainnya
            </li>
          ) : null}
        </ul>
      )}
    </SectionFrame>
  );
}
