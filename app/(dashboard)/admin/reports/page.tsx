"use client";

import Link from "next/link";
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
import { Lock, BarChart2, Users, CreditCard, ArrowRight } from "lucide-react";

const reports = [
  {
    id: 1,
    name: "Unified Financial Report",
    category: "Financial",
    frequency: "Daily/Monthly",
    usedBy: "Owner, Finance",
    sheet: "Financial",
    keyTables: "Booking, Services, Users, Store, Promotions, BenefitUsage",
    href: "/admin/reports/financial",
    locked: false,
  },
  {
    id: 2,
    name: "Booking & Operations Detail",
    category: "Operations",
    frequency: "Daily/Weekly",
    usedBy: "Admin, Manager",
    sheet: "Operations",
    keyTables: "Booking, Store, Users, Services, StoreDailyUsage",
    href: "/admin/reports/operations?tab=detail",
    locked: false,
  },
  {
    id: 3,
    name: "Groomer Performance Report",
    category: "Operations",
    frequency: "Weekly/Monthly",
    usedBy: "Manager, Owner",
    sheet: "Operations",
    keyTables: "Booking (sessions), Users, Store",
    href: "/admin/reports/operations?tab=groomer-performance",
    locked: false,
  },
  {
    id: 4,
    name: "Capacity Utilisation Report",
    category: "Operations",
    frequency: "Weekly/Monthly",
    usedBy: "Manager, Owner",
    sheet: "Operations",
    keyTables: "StoreDailyCapacity, StoreDailyUsages, Store",
    href: "/admin/reports/operations?tab=capacity-utilisation",
    locked: false,
  },
  {
    id: 5,
    name: "Cancellation & No-show Report",
    category: "Operations",
    frequency: "Weekly/Monthly",
    usedBy: "Manager, Admin",
    sheet: "Operations",
    keyTables: "Booking, Users, Store",
    href: "/admin/reports/operations?tab=cancellation",
    locked: false,
  },
  {
    id: 6,
    name: "Customer & Pet Master Data",
    category: "Customer",
    frequency: "On Demand",
    usedBy: "Admin, CRM",
    sheet: "Customer",
    keyTables: "Users, Pets, PetMemberships, MembershipPlans",
    href: "/admin/reports/customer?tab=master-data",
    locked: false,
  },
  {
    id: 7,
    name: "Customer Retention / Insight",
    category: "Customer",
    frequency: "Weekly/Monthly",
    usedBy: "Owner, Marketing",
    sheet: "Customer",
    keyTables: "Pets, Booking, Users",
    href: "/admin/reports/customer?tab=retention",
    locked: false,
  },
  {
    id: 8,
    name: "Lapsed & At-Risk Customer List",
    category: "Customer",
    frequency: "Weekly",
    usedBy: "Marketing, CS",
    sheet: "Customer",
    keyTables: "Pets, Booking, Users",
    href: "/admin/reports/customer?tab=lapsed-at-risk",
    locked: false,
  },
  {
    id: 9,
    name: "New Customer Conversion",
    category: "Customer",
    frequency: "Monthly",
    usedBy: "Owner, Marketing",
    sheet: "Customer",
    keyTables: "Users, Pets, Booking",
    href: "/admin/reports/customer?tab=new-conversion",
    locked: false,
  },
  {
    id: 10,
    name: "VIP / Top Customer Report",
    category: "Customer",
    frequency: "Monthly",
    usedBy: "Owner, Marketing",
    sheet: "Customer",
    keyTables: "Users, Pets, Booking, PetMemberships",
    href: "/admin/reports/customer?tab=vip-top-customer",
    locked: false,
  },
  {
    id: 11,
    name: "Membership Detail Report",
    category: "Membership",
    frequency: "Monthly",
    usedBy: "Owner, Finance",
    sheet: "Membership",
    keyTables: "PetMemberships, MembershipPlans, Pets, Users",
    href: "/admin/reports/membership?tab=detail",
    locked: false,
  },
  {
    id: 12,
    name: "Membership Expiry Report",
    category: "Membership",
    frequency: "Daily/Weekly",
    usedBy: "Admin, CS",
    sheet: "Membership",
    keyTables: "PetMemberships, MembershipPlans, Pets, Users",
    href: "/admin/reports/membership?tab=expiry",
    locked: false,
  },
  {
    id: 13,
    name: "Membership Revenue & Renewal",
    category: "Membership",
    frequency: "Monthly",
    usedBy: "Owner, Finance",
    sheet: "Membership",
    keyTables: "PetMemberships, MembershipPlans",
    href: "/admin/reports/membership?tab=revenue",
    locked: false,
  },
  {
    id: 14,
    name: "Benefit Utilisation Report",
    category: "Membership",
    frequency: "Monthly",
    usedBy: "Owner, Finance",
    sheet: "Membership",
    keyTables: "BenefitUsage, PetMemberships, MembershipPlans, Booking",
    href: "/admin/reports/membership?tab=benefit-utilisation",
    locked: false,
  },
];

const categoryConfig: Record<
  string,
  { color: string; bg: string; icon: React.ElementType }
> = {
  Financial: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    icon: BarChart2,
  },
  Operations: {
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    icon: BarChart2,
  },
  Customer: {
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800",
    icon: Users,
  },
  Membership: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    icon: CreditCard,
  },
};

const summaryCards = [
  { label: "Financial", count: 1, category: "Financial" },
  { label: "Operations", count: 4, category: "Operations" },
  { label: "Customer & Pet", count: 5, category: "Customer" },
  { label: "Membership", count: 4, category: "Membership" },
];

export default function ReportIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Report Index</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pawship Grooming — Report Specification v1.0 · May 2026
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((s) => {
          const cfg = categoryConfig[s.category];
          return (
            <Card key={s.category} className={`border ${cfg.bg}`}>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className={`text-xs font-medium ${cfg.color}`}>
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className={`text-3xl font-bold ${cfg.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground">
                  {s.count === 1 ? "report" : "reports"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Report Name</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden lg:table-cell">Used By</TableHead>
                <TableHead className="hidden xl:table-cell">Key DB Tables</TableHead>
                <TableHead className="w-20 text-right">Spec</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const cfg = categoryConfig[r.category];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.locked && (
                          <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                        )}
                        <span className="font-medium text-sm">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={`text-xs ${cfg.color} ${cfg.bg}`}
                      >
                        {r.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {r.frequency}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {r.usedBy}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground font-mono">
                      {r.keyTables}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.href ? (
                        <Link
                          href={r.href}
                          className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color} hover:underline`}
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">
                          Soon
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Financial reports are locked. Operations, Customer & Membership reports
        are in the spec below.
      </p>
    </div>
  );
}
