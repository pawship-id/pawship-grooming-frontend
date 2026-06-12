"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardPeriod = "today" | "week" | "month" | "custom" | "all";

export interface DashboardFiltersState {
  storeId: string; // "all" or store _id
  preset: DashboardPeriod;
  from: string; // YYYY-MM-DD when preset === "custom"
  to: string; // YYYY-MM-DD when preset === "custom"
}

interface DashboardFiltersContextValue extends DashboardFiltersState {
  setStoreId: (id: string) => void;
  setPreset: (preset: DashboardPeriod) => void;
  setCustomRange: (from: string, to: string) => void;
  resolvedRange: () => { from: string; to: string } | null;
}

const DashboardFiltersContext =
  createContext<DashboardFiltersContextValue | null>(null);

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function presetRange(
  preset: DashboardPeriod,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | null {
  // "all" (Semua) = tanpa filter periode → null agar konsumen mengirim
  // from/to undefined (backend memperlakukannya sebagai all time).
  if (preset === "all") return null;
  const now = new Date();
  if (preset === "today") {
    const d = toYMD(now);
    return { from: d, to: d };
  }
  if (preset === "week") {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: toYMD(mon), to: toYMD(sun) };
  }
  if (preset === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toYMD(first), to: toYMD(last) };
  }
  if (preset === "custom" && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  return null;
}

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState<string>("all");
  const [preset, setPreset] = useState<DashboardPeriod>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const setCustomRange = useCallback((nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setPreset("custom");
  }, []);

  const resolvedRange = useCallback(
    () => presetRange(preset, from, to),
    [preset, from, to],
  );

  const value = useMemo<DashboardFiltersContextValue>(
    () => ({
      storeId,
      preset,
      from,
      to,
      setStoreId,
      setPreset,
      setCustomRange,
      resolvedRange,
    }),
    [storeId, preset, from, to, setCustomRange, resolvedRange],
  );

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters() {
  const ctx = useContext(DashboardFiltersContext);
  if (!ctx) {
    throw new Error(
      "useDashboardFilters must be used inside DashboardFiltersProvider",
    );
  }
  return ctx;
}
