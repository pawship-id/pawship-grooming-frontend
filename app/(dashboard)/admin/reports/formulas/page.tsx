"use client";

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

interface FormulaRow {
  metric: string;
  formula: string;
  notes: string;
  highlight?: "green" | "amber" | "red" | "alert";
}

const petStatusRows: FormulaRow[] = [
  {
    metric: "Idle",
    formula: "total_visits = 0",
    notes: "Registered but never booked any service. No time axis.",
    highlight: "amber",
  },
  {
    metric: "New",
    formula: "first_booking_date >= TODAY - 14 days",
    notes: "First visit within last 14 days. Still in honeymoon window.",
    highlight: "green",
  },
  {
    metric: "Active",
    formula: "days_since_last_visit <= 14 AND first_booking < 14d ago",
    notes: "Regular returning customer.",
    highlight: "green",
  },
  {
    metric: "At risk",
    formula: "days_since_last_visit 15–30 AND total_visits > 1",
    notes: "Drifting. Send reminder before they lapse.",
    highlight: "amber",
  },
  {
    metric: "Lapsed",
    formula: "days_since_last_visit > 30 AND total_visits > 1",
    notes: "Gone quiet. Re-engagement needed.",
    highlight: "red",
  },
];

const renewalRateRows: FormulaRow[] = [
  {
    metric: "Numerator",
    formula: "COUNT(pets who purchased new membership)",
    notes: "Includes early and late renewals.",
  },
  {
    metric: "Denominator",
    formula: "COUNT(pets whose membership expired in last 30 days)",
    notes: "Closed window — rolling 30 days.",
  },
  {
    metric: "Early renewal",
    formula: "purchased_at < previous end_date",
    notes: "Before expiry. Perk applied. No day limit.",
    highlight: "green",
  },
  {
    metric: "Late renewal",
    formula: "purchased_at >= previous end_date",
    notes: "After expiry. Still counts. No perk.",
    highlight: "amber",
  },
  {
    metric: "Lapsed",
    formula: "No new membership within 30 days of expiry",
    notes: "Counts as churn in denominator.",
    highlight: "red",
  },
];

const rp0AlertRows: FormulaRow[] = [
  {
    metric: "Fire alert when",
    formula: "total_price = 0 AND membership_benefit = 0",
    notes: "No membership benefit was applied — suspicious.",
    highlight: "alert",
  },
  {
    metric: "Do NOT alert",
    formula: "total_price = 0 AND BenefitUsage.amount_used > 0",
    notes: "Member benefit covered 100% of cost. Legitimate.",
    highlight: "green",
  },
];

const commissionRows: FormulaRow[] = [
  {
    metric: "Solo session",
    formula: "gross_total * groomer_tier_rate",
    notes: "One groomer = 100% attribution.",
  },
  {
    metric: "Shared session",
    formula: "(gross_total * 0.5) * groomer_tier_rate",
    notes: "Two groomers = 50% attribution each.",
  },
  {
    metric: "Gross total",
    formula: "sub_total_service + travel_fee",
    notes: "Before any discount. Source: Booking table.",
  },
];

const capacityRows: FormulaRow[] = [
  {
    metric: "Effective capacity",
    formula:
      "COALESCE(StoreDailyCapacity.total_capacity_minutes, Store.capacity.default_daily_capacity_minutes)",
    notes: "Daily override takes precedence over store default.",
  },
  {
    metric: "Utilisation %",
    formula: "StoreDailyUsages.used_minutes / effective_capacity * 100",
    notes: "Green <70% | Amber 70-90% | Red >90%.",
  },
];

const onTimeRows: FormulaRow[] = [
  {
    metric: "On time",
    formula: "sessions[].finished_at <= started_at + Services.duration",
    notes: "Finished at or before estimated end time.",
    highlight: "green",
  },
  {
    metric: "Overrun mins",
    formula: "MAX(0, finished_at - estimated_end)",
    notes: "Only for late sessions. 0 if on time.",
  },
  {
    metric: "Rate %",
    formula: "on_time_count / total_sessions * 100",
    notes: "Flag amber <80%, red <60%.",
  },
];

const benefitRoiRows: FormulaRow[] = [
  {
    metric: "Formula",
    formula: "SUM(BenefitUsage.amount_used) / MembershipPlans.price * 100",
    notes: "% of membership price consumed as benefits.",
  },
  {
    metric: ">100%",
    formula: "Pet used more in benefits than they paid for membership",
    notes: "That tier may be underwater — review pricing.",
    highlight: "red",
  },
  {
    metric: "<50%",
    formula: "Member underusing benefits",
    notes: "Risk of non-renewal — send reminder to use benefits.",
    highlight: "amber",
  },
];

const highlightClass: Record<string, string> = {
  green: "bg-emerald-50 dark:bg-emerald-950/20",
  amber: "bg-amber-50 dark:bg-amber-950/20",
  red: "bg-red-50 dark:bg-red-950/20",
  alert: "bg-red-100 dark:bg-red-950/40",
};

const metricHighlight: Record<string, string> = {
  green: "text-emerald-700 dark:text-emerald-400 font-semibold",
  amber: "text-amber-700 dark:text-amber-400 font-semibold",
  red: "text-red-700 dark:text-red-400 font-semibold",
  alert: "text-red-700 dark:text-red-400 font-bold",
};

function FormulaTable({ rows }: { rows: FormulaRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-40">Metric / Status</TableHead>
          <TableHead>Formula / Condition</TableHead>
          <TableHead className="hidden sm:table-cell">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow
            key={i}
            className={r.highlight ? highlightClass[r.highlight] : ""}
          >
            <TableCell
              className={`text-sm ${
                r.highlight
                  ? metricHighlight[r.highlight]
                  : "font-medium text-foreground"
              }`}
            >
              {r.metric}
            </TableCell>
            <TableCell className="font-mono text-xs text-foreground">
              {r.formula}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
              {r.notes}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const sections = [
  {
    title: "Pet Status",
    subtitle: "CASE WHEN — used in all pet-level queries. Evaluated top to bottom, first match wins.",
    tag: "CASE WHEN",
    tagClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
    rows: petStatusRows,
  },
  {
    title: "Renewal Rate",
    subtitle: "Core membership health metric. Flag if <70%.",
    tag: "Membership",
    tagClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    rows: renewalRateRows,
  },
  {
    title: "Rp 0 Alert",
    subtitle: "Fire when total_price = 0 AND no benefit applied — suspicious zero-revenue booking.",
    tag: "Alert",
    tagClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    rows: rp0AlertRows,
  },
  {
    title: "Commission Base",
    subtitle: "Gross before discount. Per-groomer rate from groomer_tiers table.",
    tag: "Financial",
    tagClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    rows: commissionRows,
  },
  {
    title: "Capacity Utilisation",
    subtitle: "Effective capacity = daily override or store default, whichever is set.",
    tag: "Operations",
    tagClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    rows: capacityRows,
  },
  {
    title: "On-time Rate (Groomer)",
    subtitle: "Finished at or before estimated end. Flag amber <80%, red <60%.",
    tag: "Operations",
    tagClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    rows: onTimeRows,
  },
  {
    title: "Benefit ROI",
    subtitle: "% of membership price recovered in benefits used. >100% = member got more than they paid.",
    tag: "Membership",
    tagClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    rows: benefitRoiRows,
  },
];

export default function FormulasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Key Formulas & Status Definitions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference for engineers — Pawship Grooming Report Specification v1.0
        </p>
      </div>

      {/* Quick reference badges */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <a
            key={s.title}
            href={`#${s.title.toLowerCase().replace(/\s+/g, "-")}`}
            className="inline-flex items-center gap-1"
          >
            <Badge
              variant="outline"
              className={`text-xs cursor-pointer hover:opacity-80 ${s.tagClass}`}
            >
              {s.title}
            </Badge>
          </a>
        ))}
      </div>

      {sections.map((s) => (
        <Card
          key={s.title}
          id={s.title.toLowerCase().replace(/\s+/g, "-")}
        >
          <CardHeader className="pb-0 pt-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                {s.title}
              </CardTitle>
              <Badge
                variant="outline"
                className={`text-xs ${s.tagClass}`}
              >
                {s.tag}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{s.subtitle}</p>
          </CardHeader>
          <CardContent className="p-0">
            <FormulaTable rows={s.rows} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
