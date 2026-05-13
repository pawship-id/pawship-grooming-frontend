"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ColType = "Raw" | "Computed" | "Snapshot" | "Joined" | "Alert";

interface Column {
  name: string;
  table: string;
  source: string;
  type: ColType;
  description: string;
}

const typeConfig: Record<ColType, { label: string; className: string }> = {
  Raw: {
    label: "Raw",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  Computed: {
    label: "Computed",
    className:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
  },
  Snapshot: {
    label: "Snapshot",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  Joined: {
    label: "Joined",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
  Alert: {
    label: "Alert",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  },
};

const reportA: Column[] = [
  { name: "booking_id", table: "Booking", source: "_id", type: "Raw", description: "Primary key." },
  { name: "booking_date", table: "Booking", source: "date", type: "Raw", description: "Date of the session." },
  { name: "time_slot", table: "Booking", source: "time_range", type: "Raw", description: "Scheduled time range." },
  { name: "booking_type", table: "Booking", source: "type", type: "Raw", description: "in_store or in_home." },
  { name: "booking_status", table: "Booking", source: "booking_confirmed", type: "Raw", description: "approved / not_confirmed / cancelled." },
  { name: "session_status", table: "Booking", source: "sessions[].status", type: "Raw", description: "not_started / in_progress / finished." },
  { name: "store_name", table: "Store", source: "name", type: "Joined", description: "Branch. Null for in-home." },
  { name: "customer_name", table: "Booking", source: "customer_snapshot.name", type: "Snapshot", description: "Customer name at booking time." },
  { name: "customer_phone", table: "Booking", source: "customer_snapshot.phone_number", type: "Snapshot", description: "For follow-up if cancellation or no-show." },
  { name: "pet_name", table: "Booking", source: "pet_snapshot.name", type: "Snapshot", description: "Pet name at booking time." },
  { name: "member_type", table: "Booking", source: "pet_snapshot.member_type", type: "Snapshot", description: "Membership tier at booking time." },
  { name: "service_name", table: "Services", source: "name", type: "Joined", description: "Specific service booked." },
  { name: "service_type", table: "Services", source: "service_type_id → Options", type: "Joined", description: "grooming / hotel / add-on." },
  { name: "addon_names", table: "Service_Addons", source: "name", type: "Joined", description: "Comma-separated add-ons." },
  { name: "groomer_1_name", table: "Users", source: "profile.groomer.full_name", type: "Joined", description: "Primary groomer." },
  { name: "groomer_1_task", table: "Booking", source: "sessions[0].type", type: "Raw", description: "Task — bathing, styling, etc." },
  { name: "groomer_2_name", table: "Users", source: "profile.groomer.full_name", type: "Joined", description: "Second groomer if split session. Null otherwise." },
  { name: "groomer_2_task", table: "Booking", source: "sessions[1].type", type: "Raw", description: "Task for second groomer." },
  { name: "scheduled_start", table: "Booking", source: "time_range (start)", type: "Raw", description: "Scheduled start time." },
  { name: "started_at", table: "Booking", source: "sessions[].started_at", type: "Raw", description: "Actual start time." },
  { name: "finished_at", table: "Booking", source: "sessions[].finished_at", type: "Raw", description: "Actual finish time." },
  { name: "estimated_duration", table: "Services", source: "duration", type: "Joined", description: "Expected duration from services table." },
  { name: "actual_duration_mins", table: "Booking", source: "finished_at - started_at", type: "Computed", description: "Actual session duration in minutes." },
  { name: "is_on_time", table: "Booking", source: "finished_at <= estimated_end", type: "Computed", description: "TRUE if finished at or before estimated end. estimated_end = started_at + Services.duration." },
  { name: "overrun_mins", table: "Booking", source: "finished_at - estimated_end", type: "Computed", description: "Minutes over estimated time. 0 if on time. For late session analysis." },
  { name: "net_total", table: "Booking", source: "total_price", type: "Raw", description: "Final amount charged." },
  { name: "payment_method", table: "Booking", source: "payment_method", type: "Raw", description: "Cash / transfer / e-wallet." },
  { name: "cancellation_reason", table: "Booking", source: "note (if cancelled)", type: "Raw", description: "Reason for cancellation if available." },
  { name: "pre_conditions", table: "Booking", source: "sessions[].pre_conditions", type: "Raw", description: "Pet condition notes before session. Ops context." },
  { name: "internal_note", table: "Booking", source: "sessions[].internal_note", type: "Raw", description: "Internal groomer notes. Not visible to customer." },
];

const reportB: Column[] = [
  { name: "groomer_id", table: "Users", source: "_id", type: "Raw", description: "Primary key for groomer." },
  { name: "groomer_name", table: "Users", source: "profile.groomer.full_name", type: "Raw", description: "Full name." },
  { name: "groomer_rating", table: "Users", source: "profile.groomer.rating", type: "Raw", description: "Current groomer rating (if tracked)." },
  { name: "store_placement", table: "Users", source: "profile.groomer.placement", type: "Raw", description: "Which branch this groomer is assigned to." },
  { name: "period_start", table: "—", source: "filter input", type: "Computed", description: "Start of reporting period." },
  { name: "period_end", table: "—", source: "filter input", type: "Computed", description: "End of reporting period." },
  { name: "total_sessions", table: "Booking", source: "COUNT(sessions where groomer_id matches)", type: "Computed", description: "Total sessions handled in period (as groomer 1 or 2)." },
  { name: "solo_sessions", table: "Booking", source: "sessions where only 1 groomer", type: "Computed", description: "Sessions where this groomer was the only one assigned." },
  { name: "shared_sessions", table: "Booking", source: "sessions with 2 groomers", type: "Computed", description: "Sessions shared with another groomer. Relevant for commission split." },
  { name: "orders_completed", table: "Booking", source: "COUNT finished sessions", type: "Computed", description: "Completed sessions in period." },
  { name: "on_time_sessions", table: "Booking", source: "COUNT where finished_at <= estimated_end", type: "Computed", description: "Sessions completed on or before estimated end time." },
  { name: "on_time_rate_pct", table: "Booking", source: "on_time / total * 100", type: "Computed", description: "On-time rate %. Flag amber <80%, red <60%." },
  { name: "avg_duration_mins", table: "Booking", source: "AVG(actual_duration_mins)", type: "Computed", description: "Average actual session duration. Compare vs service estimated duration." },
  { name: "avg_overrun_mins", table: "Booking", source: "AVG(overrun_mins) late only", type: "Computed", description: "Average overrun for late sessions only. Chronic small overruns = scheduling issue." },
  { name: "gross_revenue_attributed", table: "Booking", source: "SUM(commission_base)", type: "Computed", description: "Gross revenue attributed to this groomer. Solo = 100%, shared = 50% of booking gross." },
];

const reportC: Column[] = [
  { name: "store_id", table: "Store", source: "_id", type: "Raw", description: "FK to store." },
  { name: "store_name", table: "Store", source: "name", type: "Raw", description: "Branch name." },
  { name: "date", table: "StoreDailyCapacity", source: "date", type: "Raw", description: "The date being reported." },
  { name: "total_capacity_mins", table: "StoreDailyCapacity", source: "total_capacity_minutes", type: "Raw", description: "Override capacity for that date if set. Otherwise use Store.capacity.default_daily_capacity_minutes." },
  { name: "default_capacity_mins", table: "Store", source: "capacity.default_daily_capacity_minutes", type: "Raw", description: "Fallback when no daily override exists." },
  { name: "effective_capacity", table: "—", source: "COALESCE(daily override, default)", type: "Computed", description: "Actual capacity used for calculations." },
  { name: "used_minutes", table: "StoreDailyUsages", source: "used_minutes", type: "Raw", description: "Total minutes consumed by bookings on this date." },
  { name: "utilisation_pct", table: "—", source: "used_minutes / effective_capacity * 100", type: "Computed", description: "Utilisation %. Green <70%, amber 70-90%, red >90%." },
  { name: "remaining_minutes", table: "—", source: "effective_capacity - used_minutes", type: "Computed", description: "Available capacity remaining." },
  { name: "total_bookings", table: "Booking", source: "COUNT where store_id + date", type: "Computed", description: "Total bookings on this date at this store." },
  { name: "overbooking_limit", table: "Store", source: "capacity.overbooking_limit_minutes", type: "Raw", description: "Maximum allowed overbooking buffer in minutes." },
  { name: "is_overbooked", table: "—", source: "used_minutes > effective_capacity", type: "Computed", description: "Boolean. TRUE if over standard capacity." },
];

const reportD: Column[] = [
  { name: "booking_id", table: "Booking", source: "_id", type: "Raw", description: "Booking reference." },
  { name: "booking_date", table: "Booking", source: "date", type: "Raw", description: "Scheduled date." },
  { name: "event_type", table: "Booking", source: "booking_confirmed", type: "Raw", description: "cancelled or no_show (to be added as a status)." },
  { name: "store_name", table: "Store", source: "name", type: "Joined", description: "Branch." },
  { name: "customer_name", table: "Booking", source: "customer_snapshot.name", type: "Snapshot", description: "Customer who cancelled/no-showed." },
  { name: "customer_phone", table: "Booking", source: "customer_snapshot.phone_number", type: "Snapshot", description: "For follow-up contact." },
  { name: "pet_name", table: "Booking", source: "pet_snapshot.name", type: "Snapshot", description: "Pet." },
  { name: "service_name", table: "Services", source: "name", type: "Joined", description: "Service that was cancelled." },
  { name: "groomer_name", table: "Users", source: "profile.groomer.full_name", type: "Joined", description: "Groomer who was assigned — impacted by the cancellation." },
  { name: "notice_mins", table: "Booking", source: "date - cancelled_at (if logged)", type: "Computed", description: "How far in advance the cancellation was made. Short notice = higher impact." },
  { name: "cancellation_reason", table: "Booking", source: "note", type: "Raw", description: "Reason if provided by customer or admin." },
  { name: "revenue_lost", table: "Booking", source: "total_price", type: "Raw", description: "Revenue that would have been earned. For calculating cost of cancellations." },
  { name: "customer_noshow_count", table: "Booking", source: "COUNT no_show per customer_id", type: "Computed", description: "Total no-shows by this customer across all time. Flag repeat offenders (>=2)." },
];

const tabs = [
  { id: "a", label: "A — Booking & Ops Detail", description: "One row per booking", columns: reportA },
  { id: "b", label: "B — Groomer Performance", description: "One row per groomer per period", columns: reportB },
  { id: "c", label: "C — Capacity Utilisation", description: "One row per store per day", columns: reportC },
  { id: "d", label: "D — Cancellation & No-show", description: "One row per cancelled/no-show booking", columns: reportD },
];

const filters = [
  "date range",
  "store_id / branch",
  "groomer_id",
  "booking_type (in_store / in_home)",
  "session_status",
  "service_type",
];

export default function OperationsReportPage() {
  const [activeTab, setActiveTab] = useState("a");
  const current = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Operations Reports
          </h1>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
          >
            Operations
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports #2–5 · Used by: Admin, Manager, Owner · Sheet: Operations
        </p>
      </div>

      {/* Type legend */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Type Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-4">
          {(Object.keys(typeConfig) as ColType[]).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className={`text-xs ${typeConfig[t].className}`}
            >
              {t === "Raw" && "[Raw] = direct DB field"}
              {t === "Computed" && "[Computed] = calculated at query time"}
              {t === "Snapshot" && "[Snapshot] = stored at booking time"}
              {t === "Joined" && "[Joined] = from another table"}
              {t === "Alert" && "[Alert] = status flag"}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-4">
          {filters.map((f) => (
            <Badge key={f} variant="secondary" className="text-xs font-mono">
              {f}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Sub-report tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Column spec table */}
      <Card>
        <CardHeader className="pb-0 pt-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            {current.label}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{current.description}</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Column Name</TableHead>
                <TableHead className="hidden sm:table-cell w-36">DB Table</TableHead>
                <TableHead className="hidden md:table-cell">DB Field / Source</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead>Description & Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.columns.map((col) => {
                const tc = typeConfig[col.type];
                return (
                  <TableRow key={col.name}>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {col.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground italic">
                      {col.table}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">
                      {col.source}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${tc.className}`}
                      >
                        {tc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {col.description}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
