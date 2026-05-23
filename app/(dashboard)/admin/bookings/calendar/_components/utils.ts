// Status colors shared with the bookings list page. Keep in sync with
// admin/bookings/page.tsx so badge / scheduler colors match.
export const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground border-accent/40",
  confirmed: "bg-secondary/60 text-secondary-foreground border-secondary",
  waitlist: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "driver on the way": "bg-blue-100 text-blue-800 border-blue-300",
  "groomer on the way": "bg-blue-100 text-blue-800 border-blue-300",
  arrived: "bg-primary/10 text-primary border-primary/30",
  "in progress": "bg-primary/10 text-primary border-primary/30",
  completed: "bg-secondary/60 text-secondary-foreground border-secondary",
  returned:
    "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600",
  rescheduled: "bg-accent/20 text-accent-foreground border-accent/40",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// Returns the Monday of the week containing the given date.
export function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, diffToMon));
}

export function weekDays(anchor: Date) {
  const mon = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Parse a "HH:MM - HH:MM" range (or "HH:MM") into start/end minutes since 00:00.
// Falls back to a 60-minute block at 09:00 if the value is unparseable.
export function parseTimeRange(raw?: string | null): {
  startMin: number;
  endMin: number;
} {
  if (!raw) return { startMin: 9 * 60, endMin: 10 * 60 };
  const matches = raw.match(/(\d{1,2}):(\d{2})/g);
  if (!matches || matches.length === 0)
    return { startMin: 9 * 60, endMin: 10 * 60 };
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map((n) => parseInt(n, 10));
    return h * 60 + m;
  };
  const startMin = toMin(matches[0]);
  const endMin =
    matches.length > 1 ? toMin(matches[1]) : Math.min(startMin + 60, 23 * 60);
  return { startMin, endMin: Math.max(endMin, startMin + 30) };
}

