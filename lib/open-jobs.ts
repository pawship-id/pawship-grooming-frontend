import {
  getGroomerOpenJobs,
  type AdminBooking,
  type GetGroomerOpenJobsParams,
} from "@/lib/api/bookings";

// ── Date helpers ─────────────────────────────────────────────────────────────

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

// ── Status priority sort ─────────────────────────────────────────────────────
//
// arrived → in progress → confirmed → everything else.
// Used as a default fallback even though the backend already sorts; keeping
// the same priority client-side lets us merge results from multiple endpoints
// (e.g. today's open jobs + urgent overdue list) and re-sort consistently.

export const OPEN_JOBS_STATUS_PRIORITY: Record<string, number> = {
  arrived: 1,
  "in progress": 2,
  confirmed: 3,
};

export function compareOpenJobsByStatusPriority(
  a: AdminBooking,
  b: AdminBooking,
): number {
  const pa = OPEN_JOBS_STATUS_PRIORITY[a.booking_status] ?? 99;
  const pb = OPEN_JOBS_STATUS_PRIORITY[b.booking_status] ?? 99;
  if (pa !== pb) return pa - pb;
  // tie-break: earliest date first, then most recently created first
  const da = a.date ? new Date(a.date).getTime() : 0;
  const db = b.date ? new Date(b.date).getTime() : 0;
  if (da !== db) return da - db;
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return cb - ca;
}

// ── Reusable fetchers ────────────────────────────────────────────────────────
//
// These wrap `getGroomerOpenJobs` so that:
//   - the Open Jobs page can fetch today's open jobs with no extra wiring
//   - the (future) urgent dashboard section can call the same helper with a
//     different scope/date window, share the same status-priority sort, and
//     not duplicate the API shape.

export type OpenJobsScope = "today" | "all" | "urgent";

export interface FetchOpenJobsOptions
  extends Omit<GetGroomerOpenJobsParams, "scope"> {
  scope?: OpenJobsScope;
}

/** Default fetcher for the Open Jobs page — today only, branch auto-scoped. */
export async function fetchTodayOpenJobs(
  overrides: Partial<FetchOpenJobsOptions> = {},
) {
  const today = todayYMD();
  return getGroomerOpenJobs({
    limit: 50,
    date_from: today,
    date_to: today,
    ...overrides,
  });
}

/**
 * Reusable fetcher for the dashboard "Urgent" section.
 * Returns open jobs outside today's window (overdue + upcoming) — i.e. the
 * complement of `fetchTodayOpenJobs`. The backend serves both via the same
 * endpoint and applies the same status-priority sort.
 */
export async function fetchUrgentOpenJobs(
  overrides: Partial<FetchOpenJobsOptions> = {},
) {
  return getGroomerOpenJobs({
    limit: 50,
    scope: "urgent",
    ...overrides,
  });
}
