"use client";

import { BranchFilter } from "./branch-filter";
import { PeriodFilter } from "./period-filter";

export function DashboardFilterBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Cabang
        </span>
        <BranchFilter />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Periode
        </span>
        <PeriodFilter />
      </div>
    </div>
  );
}
