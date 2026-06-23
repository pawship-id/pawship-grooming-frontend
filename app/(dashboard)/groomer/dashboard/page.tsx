"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowRight,
  Scissors,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { getGroomerMyJobs, type AdminBooking } from "@/lib/api/bookings";

const bookingStatusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  waitlist:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  "driver on the way": "bg-primary/10 text-primary",
  "groomer on the way": "bg-primary/10 text-primary",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  rescheduled:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  cancelled: "bg-destructive/10 text-destructive",
};

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getBookingDateStr(booking: AdminBooking): string {
  return booking.date?.split("T")[0] ?? "";
}

function SessionPreview({ booking }: { booking: AdminBooking }) {
  const sessions = booking.sessions || [];
  if (sessions.length === 0) return null;

  const finished = sessions.filter((s) => s.status === "finished").length;
  const inProgress = sessions.filter((s) => s.status === "in progress").length;
  const total = sessions.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  // Unique groomers
  const groomers = new Map<string, string>();
  sessions.forEach((s) => {
    if (s.groomer_detail) {
      groomers.set(
        s.groomer_detail._id,
        s.groomer_detail.username || "unknown",
      );
    }
  });
  const unassigned = sessions.filter(
    (s) => !s.groomer_id && !s.groomer_detail,
  ).length;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/30 bg-muted/30 p-2.5">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-[11px] font-medium text-muted-foreground">
          {finished}/{total}
        </span>
      </div>

      {/* Session summary */}
      <div className="flex flex-wrap gap-1.5">
        {sessions.map((s, i) => (
          <span
            key={s._id ?? i}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] capitalize ${
              s.status === "finished"
                ? "bg-secondary/60 text-secondary-foreground"
                : s.status === "in progress"
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s.status === "finished" && (
              <CheckCircle2 className="h-2.5 w-2.5" />
            )}
            {s.type}
          </span>
        ))}
      </div>

      {/* Groomers */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Scissors className="h-3 w-3" />
        {Array.from(groomers.values()).map((name) => (
          <span
            key={name}
            className="rounded-full bg-muted px-1.5 py-0.5 font-medium"
          >
            {name}
          </span>
        ))}
        {unassigned > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
            {unassigned} open
          </span>
        )}
      </div>
    </div>
  );
}

function JobCard({ booking }: { booking: AdminBooking }) {
  return (
    <Link href={`/groomer/jobs/${booking._id}`}>
      <Card className="border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-display text-lg font-bold text-foreground">
                {booking.pet_snapshot?.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {booking.service_snapshot?.name}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                className={
                  bookingStatusColors[booking.booking_status] || "bg-muted"
                }
              >
                {booking.booking_status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {booking.type}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{getBookingDateStr(booking)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{booking.time_range}</span>
            </div>
            {booking.customer && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{booking.customer.username}</span>
              </div>
            )}
            {booking.type === "in home" && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>Home visit</span>
              </div>
            )}
          </div>

          <SessionPreview booking={booking} />

          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            View Details <ArrowRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const SESSION_KEY_FROM = "groomer_dashboard_date_from";
const SESSION_KEY_TO = "groomer_dashboard_date_to";
const SESSION_KEY_TAB = "groomer_dashboard_active_tab";
const SESSION_KEY_SEARCH = "groomer_dashboard_search";

export default function GroomerDashboard() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem(SESSION_KEY_FROM) ?? "") : ""
  );
  const [dateTo, setDateTo] = useState(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem(SESSION_KEY_TO) ?? "") : ""
  );
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem(SESSION_KEY_TAB) ?? "today") : "today"
  );
  const [search, setSearch] = useState(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem(SESSION_KEY_SEARCH) ?? "") : ""
  );

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGroomerMyJobs({ limit: 200 });
      setBookings(res.bookings);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (dateFrom) sessionStorage.setItem(SESSION_KEY_FROM, dateFrom);
    else sessionStorage.removeItem(SESSION_KEY_FROM);
  }, [dateFrom]);

  useEffect(() => {
    if (dateTo) sessionStorage.setItem(SESSION_KEY_TO, dateTo);
    else sessionStorage.removeItem(SESSION_KEY_TO);
  }, [dateTo]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (search) sessionStorage.setItem(SESSION_KEY_SEARCH, search);
    else sessionStorage.removeItem(SESSION_KEY_SEARCH);
  }, [search]);

  const today = useMemo(() => getToday(), []);

  const isActive = (b: AdminBooking) =>
    b.booking_status !== "completed" &&
    b.booking_status !== "cancelled" &&
    b.booking_status !== "returned";

  const hasDateFilter = dateFrom !== "" || dateTo !== "";
  const hasFilter = hasDateFilter || search !== "";

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const d = getBookingDateStr(b);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (search && !b.pet_snapshot?.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [bookings, dateFrom, dateTo, search]);

  const todayJobs = useMemo(
    () => filteredBookings.filter((b) => getBookingDateStr(b) === today && isActive(b)),
    [filteredBookings, today],
  );
  const upcomingJobs = useMemo(
    () => filteredBookings.filter((b) => getBookingDateStr(b) > today && isActive(b)),
    [filteredBookings, today],
  );
  const incompleteJobs = useMemo(
    () => filteredBookings.filter((b) => getBookingDateStr(b) < today && isActive(b)),
    [filteredBookings, today],
  );
  const completedJobs = useMemo(
    () =>
      filteredBookings.filter(
        (b) =>
          b.booking_status === "completed" || b.booking_status === "cancelled",
      ),
    [filteredBookings],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-destructive">{error}</p>
        <button
          onClick={fetchJobs}
          className="text-sm font-medium text-primary underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              My Jobs
            </h1>
            <p className="text-sm text-muted-foreground">
              {todayJobs.length} today, {upcomingJobs.length} upcoming
              {incompleteJobs.length > 0 && `, ${incompleteJobs.length} incomplete`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-auto"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-auto"
            />
            {hasFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Reset Filter
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pet..."
            className="pl-9"
          />
        </div>
      </div>

      <Tabs
        value={activeTab === "incomplete" && incompleteJobs.length === 0 ? "today" : activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            Today{todayJobs.length > 0 && ` (${todayJobs.length})`}
          </TabsTrigger>
          {incompleteJobs.length > 0 && (
            <TabsTrigger value="incomplete" className="flex-1">
              Incomplete ({incompleteJobs.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming{upcomingJobs.length > 0 && ` (${upcomingJobs.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Completed{completedJobs.length > 0 && ` (${completedJobs.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incomplete" className="mt-4">
          <div className="flex flex-col gap-3">
            {incompleteJobs.map((b) => (
              <JobCard key={b._id} booking={b} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="today" className="mt-4">
          {todayJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Tidak ada job untuk hari ini
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todayJobs.map((b) => (
                <JobCard key={b._id} booking={b} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Tidak ada job yang akan datang
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingJobs.map((b) => (
                <JobCard key={b._id} booking={b} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Belum ada job yang selesai
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {completedJobs.map((b) => (
                <JobCard key={b._id} booking={b} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
