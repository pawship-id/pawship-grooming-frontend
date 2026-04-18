import {
  CheckCircle2,
  Clock,
  Scissors,
  XCircle,
  Undo2,
} from "lucide-react";

// ── Rich status config (label + className + icon) ────────────────────────────
export const bookingStatusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  requested: {
    label: "Requested",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  waitlist: {
    label: "Waitlist",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Clock className="h-3 w-3" />,
  },
  "driver on the way": {
    label: "Driver on the way",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Scissors className="h-3 w-3" />,
  },
  "groomer on the way": {
    label: "Groomer on the way",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Scissors className="h-3 w-3" />,
  },
  arrived: {
    label: "Arrived",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  "in progress": {
    label: "In Progress",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: <Scissors className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    className: "bg-secondary/60 text-secondary-foreground border-border/40",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  returned: {
    label: "Returned",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
    icon: <Undo2 className="h-3 w-3" />,
  },
  rescheduled: {
    label: "Rescheduled",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Clock className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ── Simple status colour map (used by admin detail) ──────────────────────────
export const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  waitlist: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "driver on the way": "bg-blue-100 text-blue-700",
  "groomer on the way": "bg-blue-100 text-blue-700",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  returned: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export const DEFAULT_STATUS_CONFIG = {
  label: "",
  className: "bg-muted text-muted-foreground border-border",
  icon: null as React.ReactNode,
};

export function getStatusConfig(status: string) {
  return bookingStatusConfig[status] ?? {
    ...DEFAULT_STATUS_CONFIG,
    label: status,
  };
}

export function getStatusColor(status: string) {
  return statusColors[status] ?? "bg-muted text-muted-foreground";
}
