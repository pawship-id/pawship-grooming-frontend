"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Filter,
  FilterX,
  Search,
  Loader2,
  AlertCircle,
  Columns,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getCustomerMasterData,
  getCustomerRetentionReport,
  getNewCustomerConversionReport,
  getVipCustomerReport,
  type CustomerMasterDataRow,
  type CustomerRetentionRow,
  type NewCustomerConversionRow,
  type VipCustomerRow,
} from "@/lib/api/reports";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-200"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRupiah(v: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v);
}

const PAGE_SIZE = 25;

// ─── Filter types ─────────────────────────────────────────────────────────────

interface CustomerFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  petType: string;
  customerCategory: string;
  membershipTier: string;
  petStatus: string;
  hasBooked: string; // "all" | "yes" | "no"
  registeredFrom: string;
  registeredTo: string;
}

const EMPTY_FILTERS: CustomerFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  petType: "",
  customerCategory: "",
  membershipTier: "",
  petStatus: "",
  hasBooked: "all",
  registeredFrom: "",
  registeredTo: "",
};

function isFilterActive(f: CustomerFilters): boolean {
  return (
    f.search !== "" ||
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.petType !== "" ||
    f.customerCategory !== "" ||
    f.membershipTier !== "" ||
    f.petStatus !== "" ||
    f.hasBooked !== "all" ||
    f.registeredFrom !== "" ||
    f.registeredTo !== ""
  );
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  idle: {
    label: "Idle",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
  new: {
    label: "New",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
  active: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  at_risk: {
    label: "At Risk",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
  },
  lapsed: {
    label: "Lapsed",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  },
};

// ─── Master Data tab ──────────────────────────────────────────────────────────

type MasterKey = keyof CustomerMasterDataRow;

const MASTER_COLS: {
  key: MasterKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "customer_code", label: "Kode Customer", defaultVisible: true },
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP", defaultVisible: true },
  { key: "customer_email", label: "Email", defaultVisible: true },
  {
    key: "customer_category",
    label: "Kategori Customer",
    defaultVisible: true,
  },
  { key: "customer_tags", label: "Tag Customer", defaultVisible: false },
  { key: "customer_address", label: "Alamat", defaultVisible: false },
  { key: "registered_at", label: "Tgl Daftar", defaultVisible: false },
  {
    key: "total_revenue_lifetime",
    label: "Total Revenue Lifetime",
    defaultVisible: true,
  },
  { key: "pet_code", label: "Kode Pet", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "pet_type", label: "Jenis Hewan", defaultVisible: true },
  { key: "breed", label: "Ras", defaultVisible: true },
  { key: "size_category", label: "Ukuran", defaultVisible: true },
  { key: "feather_type", label: "Jenis Bulu", defaultVisible: false },
  { key: "birthday", label: "Tgl Lahir Pet", defaultVisible: false },
  { key: "weight", label: "Berat (kg)", defaultVisible: false },
  { key: "pet_tags", label: "Tag Pet", defaultVisible: false },
  { key: "internal_note", label: "Catatan Internal", defaultVisible: false },
  { key: "membership_tier", label: "Tier Membership", defaultVisible: false },
  {
    key: "membership_status",
    label: "Status Membership",
    defaultVisible: false,
  },
  { key: "membership_start", label: "Mulai Membership", defaultVisible: false },
  { key: "membership_expiry", label: "Exp Membership", defaultVisible: false },
  { key: "last_visit_at", label: "Kunjungan Terakhir", defaultVisible: false },
  {
    key: "last_grooming_at",
    label: "Grooming Terakhir",
    defaultVisible: false,
  },
  { key: "pet_registered_at", label: "Tgl Daftar Pet", defaultVisible: false },
  {
    key: "total_transactions",
    label: "Total Transaksi",
    defaultVisible: true,
  },
];

const MASTER_DEFAULT_VISIBLE = new Set(
  MASTER_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

// First 9 entries in MASTER_COLS are customer-level → merged across pet rows
const CUSTOMER_KEYS = new Set<MasterKey>(
  MASTER_COLS.slice(0, 9).map((c) => c.key),
);

const DATE_COLS_MASTER = new Set<MasterKey>([
  "registered_at",
  "birthday",
  "membership_start",
  "membership_expiry",
  "last_visit_at",
  "last_grooming_at",
  "pet_registered_at",
]);

function MasterDataTab({
  data,
  loading,
  error,
  isFiltered,
  search,
}: {
  data: CustomerMasterDataRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<MasterKey>>(
    MASTER_DEFAULT_VISIBLE,
  );
  const [hoveredCustomerId, setHoveredCustomerId] = useState<string | null>(
    null,
  );

  // Reset page whenever filtered data changes
  useEffect(() => {
    setPage(1);
  }, [data]);

  // Group rows by customer — one customer may have multiple pet rows
  const groupedData = useMemo(() => {
    const map = new Map<string, CustomerMasterDataRow[]>();
    for (const row of data) {
      const arr = map.get(row.customer_id) ?? [];
      arr.push(row);
      map.set(row.customer_id, arr);
    }
    return [...map.values()];
  }, [data]);

  // Total Revenue Lifetime per customer = jumlah revenue lifetime semua pet-nya.
  // Backend mengembalikan nilai per pet; di sini dijumlahkan & ditampilkan
  // sebagai satu sel ter-merge per customer.
  const customerRevenueMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      map.set(
        row.customer_id,
        (map.get(row.customer_id) ?? 0) + (row.total_revenue_lifetime ?? 0),
      );
    }
    return map;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(groupedData.length / PAGE_SIZE));
  const pageGroups = useMemo(
    () => groupedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [groupedData, page],
  );
  const visibleColDefs = MASTER_COLS.filter((c) => visibleCols.has(c.key));
  const customerVisibleCols = visibleColDefs.filter((c) =>
    CUSTOMER_KEYS.has(c.key),
  );
  const petVisibleCols = visibleColDefs.filter(
    (c) => !CUSTOMER_KEYS.has(c.key),
  );

  const allMasterSelected = visibleCols.size === MASTER_COLS.length;
  const isMasterNonDefault =
    visibleCols.size !== MASTER_DEFAULT_VISIBLE.size ||
    [...MASTER_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: MasterKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllOrDefaultMaster() {
    if (allMasterSelected) {
      setVisibleCols(MASTER_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(MASTER_COLS.map((c) => c.key)));
    }
  }

  function renderCell(
    row: CustomerMasterDataRow,
    key: MasterKey,
  ): React.ReactNode {
    const val = row[key];
    if (key === "total_revenue_lifetime")
      return fmtRupiah(customerRevenueMap.get(row.customer_id) ?? 0);
    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;
    if (DATE_COLS_MASTER.has(key)) return fmtDate(val as string);
    if (key === "membership_status") {
      const v = String(val);
      const cfg: Record<string, { label: string; cls: string }> = {
        active: {
          label: "Aktif",
          cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        },
        pending: {
          label: "Menunggu",
          cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        },
        expired: {
          label: "Berakhir",
          cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
        },
      };
      const entry = cfg[v];
      if (!entry) return <span className="text-muted-foreground/40">—</span>;
      return (
        <Badge variant="outline" className={entry.cls}>
          {entry.label}
        </Badge>
      );
    }
    if (Array.isArray(val)) {
      const joined = val.join(", ");
      return joined ? (
        highlightText(joined, search)
      ) : (
        <span className="text-muted-foreground/40">—</span>
      );
    }
    return highlightText(String(val), search);
  }

  function handleExport() {
    const headers = MASTER_COLS.map((c) => c.label);
    const sheetRows: (string | number | null)[][] = [];
    const merges: XLSX.Range[] = [];
    let excelRow = 1; // row 0 is header

    for (const group of groupedData) {
      const startRow = excelRow;
      const spanRows = group.length;

      group.forEach((row, petIdx) => {
        sheetRows.push(
          MASTER_COLS.map((c) => {
            // Customer-level columns: only write on first pet row
            if (CUSTOMER_KEYS.has(c.key) && petIdx > 0) return null;
            // Revenue lifetime ditampilkan sebagai total per customer.
            if (c.key === "total_revenue_lifetime")
              return customerRevenueMap.get(row.customer_id) ?? 0;
            const v = row[c.key];
            if (v === null || v === undefined) return null;
            if (Array.isArray(v)) return (v as string[]).join(", ") || null;
            if (DATE_COLS_MASTER.has(c.key)) return fmtDate(v as string);
            return v as string | number;
          }),
        );
        excelRow++;
      });

      if (spanRows > 1) {
        MASTER_COLS.forEach((col, colIdx) => {
          if (CUSTOMER_KEYS.has(col.key)) {
            merges.push({
              s: { r: startRow, c: colIdx },
              e: { r: excelRow - 1, c: colIdx },
            });
          }
        });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetRows]);
    if (merges.length > 0) ws["!merges"] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Master Data");
    XLSX.writeFile(wb, "customer-master-data.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {groupedData.length.toLocaleString("id-ID")}
              </span>{" "}
              customer
              {data.length !== groupedData.length && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">
                    {data.length.toLocaleString("id-ID")}
                  </span>{" "}
                  pet
                </>
              )}
            </span>
          )}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              Data Customer &amp; Pet
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kolom{" "}
              <span className="font-medium text-foreground">
                Kunjungan Terakhir
              </span>{" "}
              diambil dari booking terakhir (tipe layanan apapun), sedangkan{" "}
              <span className="font-medium text-foreground">
                Grooming Terakhir
              </span>{" "}
              khusus layanan Grooming. Keduanya dihitung dari booking berstatus{" "}
              <span className="font-medium text-foreground">
                Completed/Returned
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isMasterNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(MASTER_DEFAULT_VISIBLE)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Default
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kolom
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {visibleCols.size}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[400px] w-56 overflow-y-auto"
              >
                <DropdownMenuCheckboxItem
                  checked={allMasterSelected}
                  onCheckedChange={selectAllOrDefaultMaster}
                  className="text-xs font-medium"
                >
                  Pilih Semua
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Customer
                </DropdownMenuLabel>
                {MASTER_COLS.slice(0, 9).map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Pet
                </DropdownMenuLabel>
                {MASTER_COLS.slice(9, 19).map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Membership &amp; Visit
                </DropdownMenuLabel>
                {MASTER_COLS.slice(19).map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs text-muted-foreground">
                    #
                  </TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead
                      key={c.key}
                      className="whitespace-nowrap text-xs"
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && pageGroups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageGroups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered
                        ? "Tidak ada data yang sesuai filter."
                        : "Belum ada data."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageGroups.flatMap((group, groupIdx) =>
                    group.map((row, petIdx) => (
                      <TableRow
                        key={row.pet_id}
                        onMouseEnter={() =>
                          setHoveredCustomerId(row.customer_id)
                        }
                        onMouseLeave={() => setHoveredCustomerId(null)}
                        style={{
                          backgroundColor:
                            hoveredCustomerId === row.customer_id
                              ? "hsl(var(--muted) / 0.5)"
                              : "transparent",
                        }}
                        className={[
                          "hover:bg-transparent",
                          petIdx === 0 && groupIdx > 0
                            ? "border-t-2 border-border"
                            : "",
                        ].join(" ")}
                      >
                        {petIdx === 0 && (
                          <>
                            <TableCell
                              rowSpan={group.length}
                              className="text-center text-xs text-muted-foreground align-top"
                            >
                              {(page - 1) * PAGE_SIZE + groupIdx + 1}
                            </TableCell>
                            {customerVisibleCols.map((c) => (
                              <TableCell
                                key={c.key}
                                rowSpan={group.length}
                                className="whitespace-nowrap text-xs align-top"
                              >
                                {renderCell(row, c.key)}
                              </TableCell>
                            ))}
                          </>
                        )}
                        {petVisibleCols.map((c) => (
                          <TableCell
                            key={c.key}
                            className="whitespace-nowrap text-xs"
                          >
                            {renderCell(row, c.key)}
                          </TableCell>
                        ))}
                      </TableRow>
                    )),
                  )
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={groupedData.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Retention tab ────────────────────────────────────────────────────────────

type RetentionKey = keyof CustomerRetentionRow;

const RETENTION_COLS: {
  key: RetentionKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "customer_code", label: "Kode Customer", defaultVisible: true },
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP", defaultVisible: false },
  { key: "customer_category", label: "Kategori", defaultVisible: false },
  { key: "pet_code", label: "Kode Pet", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "pet_type", label: "Jenis Hewan", defaultVisible: false },
  { key: "breed", label: "Ras", defaultVisible: false },
  { key: "membership_tier", label: "Tier Membership", defaultVisible: true },
  { key: "pet_status", label: "Status Pet", defaultVisible: true },
  {
    key: "first_booking_date",
    label: "Booking Pertama",
    defaultVisible: false,
  },
  {
    key: "last_booking_date",
    label: "Kunjungan Terakhir",
    defaultVisible: true,
  },
  {
    key: "days_since_last_visit",
    label: "Hari Sejak Kunjungan",
    defaultVisible: true,
  },
  { key: "total_visits", label: "Total Kunjungan", defaultVisible: true },
  { key: "total_visits_ytd", label: "Kunjungan (YTD)", defaultVisible: false },
  {
    key: "avg_visit_interval",
    label: "Rata-rata Interval (hari)",
    defaultVisible: false,
  },
  { key: "lifetime_revenue", label: "Revenue Lifetime", defaultVisible: false },
  {
    key: "lifetime_revenue_ytd",
    label: "Revenue (YTD)",
    defaultVisible: false,
  },
  { key: "favourite_service", label: "Layanan Favorit", defaultVisible: false },
];

const RETENTION_DEFAULT_VISIBLE = new Set(
  RETENTION_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const DATE_COLS_RETENTION = new Set<RetentionKey>([
  "first_booking_date",
  "last_booking_date",
]);
const REVENUE_COLS_RETENTION = new Set<RetentionKey>([
  "lifetime_revenue",
  "lifetime_revenue_ytd",
]);

function RetentionTab({
  data,
  rawData,
  loading,
  error,
  isFiltered,
  search,
}: {
  data: CustomerRetentionRow[];
  rawData: CustomerRetentionRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<RetentionKey>>(
    RETENTION_DEFAULT_VISIBLE,
  );

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = RETENTION_COLS.filter((c) => visibleCols.has(c.key));

  // Status counts from filtered data
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of data)
      counts[r.pet_status] = (counts[r.pet_status] ?? 0) + 1;
    return counts;
  }, [data]);

  const allRetentionSelected = visibleCols.size === RETENTION_COLS.length;
  const isRetentionNonDefault =
    visibleCols.size !== RETENTION_DEFAULT_VISIBLE.size ||
    [...RETENTION_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: RetentionKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllOrDefaultRetention() {
    if (allRetentionSelected) {
      setVisibleCols(RETENTION_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(RETENTION_COLS.map((c) => c.key)));
    }
  }

  function renderCell(
    row: CustomerRetentionRow,
    key: RetentionKey,
  ): React.ReactNode {
    const val = row[key];
    if (key === "pet_status") {
      const cfg = STATUS_CONFIG[String(val)] ?? STATUS_CONFIG.lapsed;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }
    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;
    if (DATE_COLS_RETENTION.has(key)) return fmtDate(val as string);
    if (REVENUE_COLS_RETENTION.has(key)) return fmtRupiah(val as number);
    return highlightText(String(val), search);
  }

  function handleExport() {
    const headers = RETENTION_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      RETENTION_COLS.map((c) => {
        const v = r[c.key];
        if (v === null || v === undefined) return "";
        if (DATE_COLS_RETENTION.has(c.key)) return fmtDate(v as string);
        if (REVENUE_COLS_RETENTION.has(c.key)) return v as number;
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Retention");
    XLSX.writeFile(wb, "customer-retention.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Status summary chips */}
      {!loading && rawData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(["idle", "new", "active", "at_risk", "lapsed"] as const).map(
            (s) => {
              const cfg = STATUS_CONFIG[s];
              const count = statusCounts[s] ?? 0;
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.className}`}
                >
                  {cfg.label}
                  <span className="font-bold">{count}</span>
                </span>
              );
            },
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              data
            </span>
          )}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              Data Retensi Customer
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Data kunjungan, revenue, dan status pet dihitung hanya dari
              booking berstatus{" "}
              <span className="font-medium text-foreground">Completed</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRetentionNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(RETENTION_DEFAULT_VISIBLE)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Default
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kolom
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {visibleCols.size}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[400px] w-56 overflow-y-auto"
              >
                <DropdownMenuCheckboxItem
                  checked={allRetentionSelected}
                  onCheckedChange={selectAllOrDefaultRetention}
                  className="text-xs font-medium"
                >
                  Pilih Semua
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {RETENTION_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs text-muted-foreground">
                    #
                  </TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead
                      key={c.key}
                      className="whitespace-nowrap text-xs"
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered
                        ? "Tidak ada data yang sesuai filter."
                        : "Belum ada data."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row, idx) => (
                    <TableRow key={`${row.customer_id}-${row.pet_id}`}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {visibleColDefs.map((c) => (
                        <TableCell
                          key={c.key}
                          className="whitespace-nowrap text-xs"
                        >
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={data.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared pagination ────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <span className="text-xs text-muted-foreground">
        Halaman <span className="font-semibold text-foreground">{page}</span>{" "}
        dari <span className="font-semibold text-foreground">{totalPages}</span>
        {" · "}
        {total.toLocaleString("id-ID")} total data
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2),
          )
          .reduce<(number | "…")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "…" ? (
              <span
                key={`e-${idx}`}
                className="px-1 text-xs text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={page === item ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(item as number)}
                className="h-7 w-7 p-0 text-xs"
              >
                {item}
              </Button>
            ),
          )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Lapsed & At-Risk tab ─────────────────────────────────────────────────────

type LapsedKey = RetentionKey;

const LAPSED_COLS: { key: LapsedKey; label: string }[] = [
  { key: "customer_code", label: "Kode Customer" },
  { key: "customer_name", label: "Nama Customer" },
  { key: "customer_phone", label: "No. HP (WhatsApp)" },
  { key: "pet_code", label: "Kode Pet" },
  { key: "pet_name", label: "Nama Pet" },
  { key: "breed", label: "Ras" },
  { key: "membership_tier", label: "Tier Membership" },
  { key: "last_booking_date", label: "Kunjungan Terakhir" },
  { key: "days_since_last_visit", label: "Hari Sejak Kunjungan" },
  { key: "avg_visit_interval", label: "Rata-rata Interval (hari)" },
  { key: "lifetime_revenue", label: "Revenue Lifetime" },
  { key: "pet_status", label: "Status" },
];

function LapsedAtRiskTab({
  data,
  loading,
  error,
  isFiltered,
  search,
}: {
  data: CustomerRetentionRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );

  const atRiskCount = useMemo(
    () => data.filter((r) => r.pet_status === "at_risk").length,
    [data],
  );
  const lapsedCount = useMemo(
    () => data.filter((r) => r.pet_status === "lapsed").length,
    [data],
  );

  function renderCell(
    row: CustomerRetentionRow,
    key: LapsedKey,
  ): React.ReactNode {
    const val = row[key];
    if (key === "pet_status") {
      const cfg = STATUS_CONFIG[String(val)] ?? STATUS_CONFIG.lapsed;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }
    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;
    if (key === "last_booking_date") return fmtDate(val as string);
    if (key === "lifetime_revenue") return fmtRupiah(val as number);
    return highlightText(String(val), search);
  }

  function handleExport() {
    const headers = LAPSED_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      LAPSED_COLS.map((c) => {
        const v = r[c.key];
        if (v === null || v === undefined) return "";
        if (c.key === "last_booking_date") return fmtDate(v as string);
        if (c.key === "lifetime_revenue") return v as number;
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lapsed & At-Risk");
    XLSX.writeFile(wb, "lapsed-at-risk-customers.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Status summary */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CONFIG.at_risk.className}`}
          >
            {STATUS_CONFIG.at_risk.label}
            <span className="font-bold">{atRiskCount}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CONFIG.lapsed.className}`}
          >
            {STATUS_CONFIG.lapsed.label}
            <span className="font-bold">{lapsedCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Total
            <span className="font-bold text-foreground">{data.length}</span>
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              data · diurutkan berdasarkan hari sejak kunjungan &amp; revenue
              tertinggi
            </span>
          )}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold">
            Daftar Customer Lapsed &amp; At-Risk
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hanya menampilkan pet berstatus{" "}
            <span className="font-medium text-orange-600 dark:text-orange-400">
              At Risk
            </span>{" "}
            dan{" "}
            <span className="font-medium text-red-600 dark:text-red-400">
              Lapsed
            </span>
            . Diurutkan berdasarkan hari terlama sejak kunjungan, lalu revenue
            lifetime tertinggi.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs text-muted-foreground">
                    #
                  </TableHead>
                  {LAPSED_COLS.map((c) => (
                    <TableHead
                      key={c.key}
                      className="whitespace-nowrap text-xs"
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={LAPSED_COLS.length + 1}
                      className="py-10 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={LAPSED_COLS.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered
                        ? "Tidak ada data yang sesuai filter."
                        : "Tidak ada customer lapsed atau at-risk."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row, idx) => (
                    <TableRow key={`${row.customer_id}-${row.pet_id}`}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {LAPSED_COLS.map((c) => (
                        <TableCell
                          key={c.key}
                          className="whitespace-nowrap text-xs"
                        >
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={data.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── New Customer Conversion tab ──────────────────────────────────────────────

type ConversionKey = keyof NewCustomerConversionRow;

const CONVERSION_COLS: {
  key: ConversionKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "customer_code", label: "Kode Customer", defaultVisible: true },
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP", defaultVisible: true },
  {
    key: "customer_category",
    label: "Kategori Customer",
    defaultVisible: false,
  },
  { key: "pet_code", label: "Kode Pet", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "pet_type", label: "Jenis Hewan", defaultVisible: true },
  { key: "pet_registered_at", label: "Tgl Daftar Pet", defaultVisible: true },
  {
    key: "days_since_registered",
    label: "Hari Sejak Daftar",
    defaultVisible: false,
  },
  { key: "has_booked", label: "Sudah Booking?", defaultVisible: true },
  {
    key: "first_booking_date",
    label: "Tgl Booking Pertama",
    defaultVisible: false,
  },
  {
    key: "days_to_first_booking",
    label: "Hari ke Booking Pertama",
    defaultVisible: false,
  },
];

const CONVERSION_DEFAULT_VISIBLE = new Set(
  CONVERSION_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

function NewConversionTab({
  data,
  loading,
  error,
  isFiltered,
  search,
  defaultDateFrom,
}: {
  data: NewCustomerConversionRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
  defaultDateFrom: string;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<ConversionKey>>(
    CONVERSION_DEFAULT_VISIBLE,
  );

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = CONVERSION_COLS.filter((c) => visibleCols.has(c.key));

  const bookedCount = useMemo(
    () => data.filter((r) => r.has_booked).length,
    [data],
  );
  const notBookedCount = useMemo(
    () => data.filter((r) => !r.has_booked).length,
    [data],
  );
  const conversionRate =
    data.length > 0 ? Math.round((bookedCount / data.length) * 100) : 0;

  const allConversionSelected = visibleCols.size === CONVERSION_COLS.length;
  const isConversionNonDefault =
    visibleCols.size !== CONVERSION_DEFAULT_VISIBLE.size ||
    [...CONVERSION_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: ConversionKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllOrDefault() {
    if (allConversionSelected) {
      setVisibleCols(CONVERSION_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(CONVERSION_COLS.map((c) => c.key)));
    }
  }

  function renderCell(
    row: NewCustomerConversionRow,
    key: ConversionKey,
  ): React.ReactNode {
    if (key === "has_booked") {
      return row.has_booked ? (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
        >
          Sudah Booking
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800"
        >
          Belum Booking
        </Badge>
      );
    }
    const val = row[key];
    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;
    if (key === "pet_registered_at" || key === "first_booking_date")
      return fmtDate(val as string);
    return highlightText(String(val), search);
  }

  function handleExport() {
    const headers = CONVERSION_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      CONVERSION_COLS.map((c) => {
        const v = r[c.key];
        if (c.key === "has_booked") return r.has_booked ? "Ya" : "Tidak";
        if (v === null || v === undefined) return "";
        if (c.key === "pet_registered_at" || c.key === "first_booking_date")
          return fmtDate(v as string);
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "New Customer Conversion");
    XLSX.writeFile(wb, "new-customer-conversion.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400">
            Belum Booking
            <span className="font-bold">{notBookedCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            Sudah Booking
            <span className="font-bold">{bookedCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Conversion Rate
            <span className="font-bold text-foreground">{conversionRate}%</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Total
            <span className="font-bold text-foreground">{data.length}</span>
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              pet · diurutkan: belum booking terlama dulu
            </span>
          )}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              Data New Customer Conversion
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Default menampilkan pet yang didaftarkan dalam{" "}
              <span className="font-medium text-foreground">
                30 hari terakhir
              </span>
              . Kolom{" "}
              <span className="font-medium text-foreground">
                Sudah Booking?
              </span>{" "}
              dihitung dari booking berstatus{" "}
              <span className="font-medium text-foreground">Completed</span>.
              Data diurutkan: belum booking → terlama terdaftar paling atas
              (paling urgent untuk di-follow up).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConversionNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(CONVERSION_DEFAULT_VISIBLE)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Default
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kolom
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {visibleCols.size}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[400px] w-56 overflow-y-auto"
              >
                <DropdownMenuCheckboxItem
                  checked={allConversionSelected}
                  onCheckedChange={selectAllOrDefault}
                  className="text-xs font-medium"
                >
                  Pilih Semua
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {CONVERSION_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs text-muted-foreground">
                    #
                  </TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead
                      key={c.key}
                      className="whitespace-nowrap text-xs"
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered
                        ? "Tidak ada data yang sesuai filter."
                        : "Belum ada data."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row, idx) => (
                    <TableRow key={`${row.customer_id}-${row.pet_id}`}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {visibleColDefs.map((c) => (
                        <TableCell
                          key={c.key}
                          className="whitespace-nowrap text-xs"
                        >
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={data.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── VIP / Top Customer tab ───────────────────────────────────────────────────

type VipKey = keyof VipCustomerRow;

const VIP_COLS: { key: VipKey; label: string; defaultVisible: boolean }[] = [
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP", defaultVisible: true },
  {
    key: "customer_category",
    label: "Kategori Customer",
    defaultVisible: false,
  },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "membership_tier", label: "Tier Membership", defaultVisible: true },
  { key: "total_visits", label: "Total Kunjungan", defaultVisible: true },
  { key: "lifetime_revenue", label: "Revenue Lifetime", defaultVisible: true },
  {
    key: "membership_revenue",
    label: "Revenue Membership",
    defaultVisible: true,
  },
  {
    key: "last_booking_date",
    label: "Kunjungan Terakhir",
    defaultVisible: true,
  },
  {
    key: "days_since_last_visit",
    label: "Hari Sejak Kunjungan",
    defaultVisible: true,
  },
  { key: "pet_status", label: "Status Pet", defaultVisible: true },
];

const VIP_DEFAULT_VISIBLE = new Set(
  VIP_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

function VipCustomerTab({
  data,
  loading,
  error,
  isFiltered,
  search,
}: {
  data: VipCustomerRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] =
    useState<Set<VipKey>>(VIP_DEFAULT_VISIBLE);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = VIP_COLS.filter((c) => visibleCols.has(c.key));

  const atRiskCount = useMemo(
    () => data.filter((r) => r.pet_status === "at_risk").length,
    [data],
  );
  const lapsedCount = useMemo(
    () => data.filter((r) => r.pet_status === "lapsed").length,
    [data],
  );

  const allVipSelected = visibleCols.size === VIP_COLS.length;
  const isVipNonDefault =
    visibleCols.size !== VIP_DEFAULT_VISIBLE.size ||
    [...VIP_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: VipKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllOrDefault() {
    if (allVipSelected) {
      setVisibleCols(VIP_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(VIP_COLS.map((c) => c.key)));
    }
  }

  function renderCell(row: VipCustomerRow, key: VipKey): React.ReactNode {
    const val = row[key];

    if (key === "pet_status") {
      const cfg = STATUS_CONFIG[String(val)] ?? STATUS_CONFIG.lapsed;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }

    if (key === "lifetime_revenue") {
      return (
        <span className="font-semibold">{fmtRupiah((val ?? 0) as number)}</span>
      );
    }

    if (key === "membership_revenue") {
      return <span>{fmtRupiah((val ?? 0) as number)}</span>;
    }

    if (key === "last_booking_date") {
      return fmtDate(val as string | null);
    }

    if (key === "days_since_last_visit") {
      if (val === null || val === undefined)
        return <span className="text-muted-foreground/40">—</span>;
      const days = val as number;
      const colorClass =
        row.pet_status === "lapsed"
          ? "font-semibold text-red-600 dark:text-red-400"
          : row.pet_status === "at_risk"
            ? "font-semibold text-orange-600 dark:text-orange-400"
            : "";
      return <span className={colorClass}>{days}</span>;
    }

    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;

    return highlightText(String(val), search);
  }

  function handleExport() {
    const headers = VIP_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      VIP_COLS.map((c) => {
        const v = r[c.key];
        if (c.key === "pet_status")
          return STATUS_CONFIG[String(v)]?.label ?? String(v);
        if (c.key === "lifetime_revenue" || c.key === "membership_revenue")
          return v as number;
        if (c.key === "last_booking_date") return fmtDate(v as string | null);
        if (v === null || v === undefined) return "";
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "VIP Top Customer");
    XLSX.writeFile(wb, "vip-top-customer.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Alert summary chips */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {(atRiskCount > 0 || lapsedCount > 0) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              VIP Perlu Perhatian
              <span className="font-bold">{atRiskCount + lapsedCount}</span>
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CONFIG.at_risk.className}`}
          >
            {STATUS_CONFIG.at_risk.label}
            <span className="font-bold">{atRiskCount}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CONFIG.lapsed.className}`}
          >
            {STATUS_CONFIG.lapsed.label}
            <span className="font-bold">{lapsedCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Total VIP
            <span className="font-bold text-foreground">{data.length}</span>
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              data · diurutkan berdasarkan revenue lifetime tertinggi
            </span>
          )}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              VIP / Top Customer
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Data diambil dari booking berstatus{" "}
              <span className="font-medium text-foreground">Completed</span>.
              Diurutkan berdasarkan{" "}
              <span className="font-medium text-foreground">
                Revenue Lifetime
              </span>{" "}
              tertinggi. Satu baris per pet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isVipNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(VIP_DEFAULT_VISIBLE)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Default
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kolom
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {visibleCols.size}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[400px] w-56 overflow-y-auto"
              >
                <DropdownMenuCheckboxItem
                  checked={allVipSelected}
                  onCheckedChange={selectAllOrDefault}
                  className="text-xs font-medium"
                >
                  Pilih Semua
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {VIP_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs text-muted-foreground">
                    #
                  </TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead
                      key={c.key}
                      className="whitespace-nowrap text-xs"
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered
                        ? "Tidak ada data yang sesuai filter."
                        : "Belum ada data."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row, idx) => (
                    <TableRow key={`${row.customer_id}-${row.pet_id}`}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {visibleColDefs.map((c) => (
                        <TableCell
                          key={c.key}
                          className="whitespace-nowrap text-xs"
                        >
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={data.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const CUSTOMER_REPORT_TABS = [
  { id: "master-data", label: "A — Customer & Pet Master Data", live: true },
  { id: "retention", label: "B — Customer Retention / Insight", live: true },
  { id: "lapsed-at-risk", label: "C — Lapsed & At-Risk", live: true },
  { id: "new-conversion", label: "D — New Customer Conversion", live: true },
  { id: "vip-top-customer", label: "E — VIP / Top Customer", live: true },
];

// ─── Page (owns data + filters) ───────────────────────────────────────────────

const VALID_TABS = [
  "master-data",
  "retention",
  "lapsed-at-risk",
  "new-conversion",
  "vip-top-customer",
] as const;

function CustomerReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (() => {
    const t = searchParams.get("tab");
    return VALID_TABS.includes(t as (typeof VALID_TABS)[number])
      ? (t as string)
      : "master-data";
  })();

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "master-data");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, []);

  function changeTab(tabId: string) {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // ── Raw data from API ────────────────────────────────────────────────────────
  const [masterRaw, setMasterRaw] = useState<CustomerMasterDataRow[]>([]);
  const [retentionRaw, setRetentionRaw] = useState<CustomerRetentionRow[]>([]);
  const [conversionRaw, setConversionRaw] = useState<
    NewCustomerConversionRow[]
  >([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [vipError, setVipError] = useState<string | null>(null);
  const [vipRaw, setVipRaw] = useState<VipCustomerRow[]>([]);

  // ── Default 30-day window for conversion tab ─────────────────────────────────
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<CustomerFilters>(EMPTY_FILTERS);

  function set<K extends keyof CustomerFilters>(
    key: K,
    val: CustomerFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const filtered = isFilterActive(filters);

  // ── Track which tabs have been loaded — fetch lazily on tab activation ──────
  // The backend now paginates + uses lean queries, but we still cap the page
  // size to 5000 rows to keep the proxy round-trip bounded under Vercel's 60s
  // limit. Typical production datasets fit comfortably; if a tab exceeds the
  // cap a follow-up will be needed.
  const PAGE_LIMIT = 5000;
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loadedTabs.has(activeTab)) return;

    if (activeTab === "master-data") {
      setMasterLoading(true);
      setMasterError(null);
      getCustomerMasterData({ limit: PAGE_LIMIT })
        .then((res) => setMasterRaw(res.data ?? []))
        .catch((e: unknown) =>
          setMasterError(e instanceof Error ? e.message : "Gagal memuat data"),
        )
        .finally(() => {
          setMasterLoading(false);
          setLoadedTabs((prev) => new Set(prev).add("master-data"));
        });
    } else if (
      activeTab === "retention" ||
      activeTab === "lapsed-at-risk"
    ) {
      // Both `retention` and `lapsed-at-risk` tabs read from retentionRaw.
      if (!loadedTabs.has("retention")) {
        setRetentionLoading(true);
        setRetentionError(null);
        getCustomerRetentionReport({ limit: PAGE_LIMIT })
          .then((res) => setRetentionRaw(res.data ?? []))
          .catch((e: unknown) =>
            setRetentionError(
              e instanceof Error ? e.message : "Gagal memuat data",
            ),
          )
          .finally(() => {
            setRetentionLoading(false);
            setLoadedTabs((prev) =>
              new Set(prev).add("retention").add("lapsed-at-risk"),
            );
          });
      }
    } else if (activeTab === "new-conversion") {
      setConversionLoading(true);
      setConversionError(null);
      getNewCustomerConversionReport({ limit: PAGE_LIMIT })
        .then((res) => setConversionRaw(res.data ?? []))
        .catch((e: unknown) =>
          setConversionError(
            e instanceof Error ? e.message : "Gagal memuat data",
          ),
        )
        .finally(() => {
          setConversionLoading(false);
          setLoadedTabs((prev) => new Set(prev).add("new-conversion"));
        });
    } else if (activeTab === "vip-top-customer") {
      setVipLoading(true);
      setVipError(null);
      getVipCustomerReport({ limit: PAGE_LIMIT })
        .then((res) => setVipRaw(res.data ?? []))
        .catch((e: unknown) =>
          setVipError(e instanceof Error ? e.message : "Gagal memuat data"),
        )
        .finally(() => {
          setVipLoading(false);
          setLoadedTabs((prev) => new Set(prev).add("vip-top-customer"));
        });
    }
  }, [activeTab, loadedTabs]);

  // ── Derive dropdown options from raw data ────────────────────────────────────
  const petTypeOptions = useMemo(
    () => [...new Set(masterRaw.map((r) => r.pet_type).filter(Boolean))].sort(),
    [masterRaw],
  );
  const customerCategoryOptions = useMemo(
    () =>
      [
        ...new Set(
          [
            ...masterRaw.map((r) => r.customer_category),
            ...retentionRaw.map((r) => r.customer_category),
          ].filter(Boolean),
        ),
      ].sort(),
    [masterRaw, retentionRaw],
  );
  const membershipTierOptions = useMemo(
    () =>
      [
        ...new Set(
          [
            ...masterRaw.map((r) => r.membership_tier),
            ...retentionRaw.map((r) => r.membership_tier),
          ].filter(Boolean),
        ),
      ].sort(),
    [masterRaw, retentionRaw],
  );

  // ── Client-side filtering ────────────────────────────────────────────────────
  const filteredMaster = useMemo(() => {
    let d = masterRaw;
    const {
      search,
      dateFrom,
      dateTo,
      petType,
      customerCategory,
      membershipTier,
      hasBooked,
    } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s),
      );
    }
    if (dateFrom)
      d = d.filter(
        (r) => r.last_visit_at && r.last_visit_at.slice(0, 10) >= dateFrom,
      );
    if (dateTo)
      d = d.filter(
        (r) => r.last_visit_at && r.last_visit_at.slice(0, 10) <= dateTo,
      );
    if (petType) d = d.filter((r) => r.pet_type === petType);
    if (customerCategory)
      d = d.filter((r) => r.customer_category === customerCategory);
    if (membershipTier)
      d = d.filter((r) => r.membership_tier === membershipTier);
    if (hasBooked === "yes") d = d.filter((r) => r.has_booked);
    if (hasBooked === "no") d = d.filter((r) => !r.has_booked);
    return d;
  }, [masterRaw, filters]);

  const filteredRetention = useMemo(() => {
    let d = retentionRaw;
    const {
      search,
      dateFrom,
      dateTo,
      petType,
      customerCategory,
      membershipTier,
      petStatus,
      hasBooked,
    } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s),
      );
    }
    if (dateFrom)
      d = d.filter(
        (r) =>
          r.last_booking_date && r.last_booking_date.slice(0, 10) >= dateFrom,
      );
    if (dateTo)
      d = d.filter(
        (r) =>
          r.last_booking_date && r.last_booking_date.slice(0, 10) <= dateTo,
      );
    if (petType) d = d.filter((r) => r.pet_type === petType);
    if (customerCategory)
      d = d.filter((r) => r.customer_category === customerCategory);
    if (membershipTier)
      d = d.filter((r) => r.membership_tier === membershipTier);
    if (petStatus) d = d.filter((r) => r.pet_status === petStatus);
    if (hasBooked === "yes") d = d.filter((r) => r.has_booked);
    if (hasBooked === "no") d = d.filter((r) => !r.has_booked);
    return d;
  }, [retentionRaw, filters]);

  const filteredLapsedAtRisk = useMemo(() => {
    let d = retentionRaw.filter(
      (r) => r.pet_status === "at_risk" || r.pet_status === "lapsed",
    );
    const { search, membershipTier, petStatus } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s),
      );
    }
    if (membershipTier)
      d = d.filter((r) => r.membership_tier === membershipTier);
    if (petStatus === "at_risk" || petStatus === "lapsed")
      d = d.filter((r) => r.pet_status === petStatus);

    return [...d].sort((a, b) => {
      const daysDiff =
        (b.days_since_last_visit ?? 0) - (a.days_since_last_visit ?? 0);
      if (daysDiff !== 0) return daysDiff;
      return (b.lifetime_revenue ?? 0) - (a.lifetime_revenue ?? 0);
    });
  }, [retentionRaw, filters]);

  // ── VIP dropdown options ──────────────────────────────────────────────────────
  const vipCategoryOptions = useMemo(
    () =>
      [
        ...new Set(vipRaw.map((r) => r.customer_category).filter(Boolean)),
      ].sort(),
    [vipRaw],
  );
  const vipMembershipTierOptions = useMemo(
    () =>
      [...new Set(vipRaw.map((r) => r.membership_tier).filter(Boolean))].sort(),
    [vipRaw],
  );

  // ── Conversion dropdown options ───────────────────────────────────────────────
  const conversionPetTypeOptions = useMemo(
    () =>
      [...new Set(conversionRaw.map((r) => r.pet_type).filter(Boolean))].sort(),
    [conversionRaw],
  );
  const conversionCategoryOptions = useMemo(
    () =>
      [
        ...new Set(
          conversionRaw.map((r) => r.customer_category).filter(Boolean),
        ),
      ].sort(),
    [conversionRaw],
  );

  const filteredNewConversion = useMemo(() => {
    let d = conversionRaw;
    const {
      search,
      registeredFrom,
      registeredTo,
      petType,
      customerCategory,
      hasBooked,
    } = filters;

    const from = registeredFrom || thirtyDaysAgoStr;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s),
      );
    }
    if (from)
      d = d.filter(
        (r) => r.pet_registered_at && r.pet_registered_at.slice(0, 10) >= from,
      );
    if (registeredTo)
      d = d.filter(
        (r) =>
          r.pet_registered_at &&
          r.pet_registered_at.slice(0, 10) <= registeredTo,
      );
    if (petType) d = d.filter((r) => r.pet_type === petType);
    if (customerCategory)
      d = d.filter((r) => r.customer_category === customerCategory);
    if (hasBooked === "yes") d = d.filter((r) => r.has_booked);
    if (hasBooked === "no") d = d.filter((r) => !r.has_booked);

    return [...d].sort((a, b) => {
      if (a.has_booked !== b.has_booked) return a.has_booked ? 1 : -1;
      return (b.days_since_registered ?? 0) - (a.days_since_registered ?? 0);
    });
  }, [conversionRaw, filters, thirtyDaysAgoStr]);

  const filteredVip = useMemo(() => {
    let d = vipRaw;
    const {
      search,
      dateFrom,
      dateTo,
      customerCategory,
      membershipTier,
      petStatus,
    } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s),
      );
    }
    if (dateFrom)
      d = d.filter(
        (r) =>
          r.last_booking_date && r.last_booking_date.slice(0, 10) >= dateFrom,
      );
    if (dateTo)
      d = d.filter(
        (r) =>
          r.last_booking_date && r.last_booking_date.slice(0, 10) <= dateTo,
      );
    if (customerCategory)
      d = d.filter((r) => r.customer_category === customerCategory);
    if (membershipTier)
      d = d.filter((r) => r.membership_tier === membershipTier);
    if (petStatus) d = d.filter((r) => r.pet_status === petStatus);

    return [...d].sort((a, b) => b.lifetime_revenue - a.lifetime_revenue);
  }, [vipRaw, filters]);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Customer Report
          </h1>
          <Badge
            variant="outline"
            className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800"
          >
            Customer
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports #6–10 · Used by: Admin, CRM, Owner, Marketing, CS · Sheet:
          Customer
        </p>
      </div>

      {/* Filter panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filter Data
          </CardTitle>
          {filtered && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
              onClick={resetFilters}
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset Filter
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1 — Search + date (tab-aware) */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Cari
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nama customer, no. HP, atau nama pet..."
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  className="pl-9 pr-8"
                />
                {filters.search && (
                  <button
                    onClick={() => set("search", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {activeTab === "new-conversion" ? (
              <>
                {/* Registered From */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tgl Daftar Pet Dari
                  </label>
                  <Input
                    type="date"
                    value={filters.registeredFrom}
                    onChange={(e) => set("registeredFrom", e.target.value)}
                    placeholder={thirtyDaysAgoStr}
                  />
                </div>
                {/* Registered To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tgl Daftar Pet Sampai
                  </label>
                  <Input
                    type="date"
                    value={filters.registeredTo}
                    onChange={(e) => set("registeredTo", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Date From */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tgl Kunjungan Dari
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => set("dateFrom", e.target.value)}
                  />
                </div>
                {/* Date To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tgl Kunjungan Sampai
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => set("dateTo", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 2 — Dropdowns (tab-aware) */}
          {activeTab === "vip-top-customer" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Customer Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Kategori Customer
                </label>
                <Select
                  value={filters.customerCategory || "__all__"}
                  onValueChange={(v) =>
                    set("customerCategory", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Kategori</SelectItem>
                    {vipCategoryOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Membership Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tier Membership
                </label>
                <Select
                  value={filters.membershipTier || "__all__"}
                  onValueChange={(v) =>
                    set("membershipTier", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Tier</SelectItem>
                    {vipMembershipTierOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pet Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Pet Status
                </label>
                <Select
                  value={filters.petStatus || "__all__"}
                  onValueChange={(v) =>
                    set("petStatus", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Status</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="lapsed">Lapsed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : activeTab === "new-conversion" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pet Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Jenis Hewan
                </label>
                <Select
                  value={filters.petType || "__all__"}
                  onValueChange={(v) =>
                    set("petType", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Jenis</SelectItem>
                    {conversionPetTypeOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Kategori Customer
                </label>
                <Select
                  value={filters.customerCategory || "__all__"}
                  onValueChange={(v) =>
                    set("customerCategory", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Kategori</SelectItem>
                    {conversionCategoryOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Booked */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Konversi
                </label>
                <Select
                  value={filters.hasBooked}
                  onValueChange={(v) => set("hasBooked", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="yes">Sudah booking</SelectItem>
                    <SelectItem value="no">Belum booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pet Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Jenis Hewan
                </label>
                <Select
                  value={filters.petType || "__all__"}
                  onValueChange={(v) =>
                    set("petType", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Jenis</SelectItem>
                    {petTypeOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Kategori Customer
                </label>
                <Select
                  value={filters.customerCategory || "__all__"}
                  onValueChange={(v) =>
                    set("customerCategory", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Kategori</SelectItem>
                    {customerCategoryOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Membership Tier */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tier Membership
                </label>
                <Select
                  value={filters.membershipTier || "__all__"}
                  onValueChange={(v) =>
                    set("membershipTier", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Tier</SelectItem>
                    {membershipTierOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Booked */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Sudah Booking?
                </label>
                <Select
                  value={filters.hasBooked}
                  onValueChange={(v) => set("hasBooked", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="yes">Ya (pernah booking)</SelectItem>
                    <SelectItem value="no">Belum booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Row 3 — Pet Status (retention + lapsed-at-risk only) */}
          {(activeTab === "retention" || activeTab === "lapsed-at-risk") && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Pet Status
                </label>
                <Select
                  value={filters.petStatus || "__all__"}
                  onValueChange={(v) =>
                    set("petStatus", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">
                      {activeTab === "lapsed-at-risk"
                        ? "At Risk + Lapsed"
                        : "Semua Status"}
                    </SelectItem>
                    {activeTab === "retention" && (
                      <>
                        <SelectItem value="idle">Idle</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </>
                    )}
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="lapsed">Lapsed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sub-report tabs */}
      <div className="flex flex-wrap gap-2">
        {CUSTOMER_REPORT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.live) {
                changeTab(t.id);
                resetFilters();
              }
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground"
                : t.live
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "cursor-not-allowed bg-muted/50 text-muted-foreground/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "master-data" && (
        <MasterDataTab
          data={filteredMaster}
          loading={masterLoading}
          error={masterError}
          isFiltered={filtered}
          search={filters.search}
        />
      )}
      {activeTab === "retention" && (
        <RetentionTab
          data={filteredRetention}
          rawData={retentionRaw}
          loading={retentionLoading}
          error={retentionError}
          isFiltered={filtered}
          search={filters.search}
        />
      )}
      {activeTab === "lapsed-at-risk" && (
        <LapsedAtRiskTab
          data={filteredLapsedAtRisk}
          loading={retentionLoading}
          error={retentionError}
          isFiltered={filtered}
          search={filters.search}
        />
      )}
      {activeTab === "new-conversion" && (
        <NewConversionTab
          data={filteredNewConversion}
          loading={conversionLoading}
          error={conversionError}
          isFiltered={filtered}
          search={filters.search}
          defaultDateFrom={thirtyDaysAgoStr}
        />
      )}
      {activeTab === "vip-top-customer" && (
        <VipCustomerTab
          data={filteredVip}
          loading={vipLoading}
          error={vipError}
          isFiltered={filtered}
          search={filters.search}
        />
      )}
    </div>
  );
}

export default function CustomerReportPageWrapper() {
  return (
    <Suspense>
      <CustomerReportPage />
    </Suspense>
  );
}
