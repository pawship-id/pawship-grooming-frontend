"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Users,
  Package,
  Scissors,
  Clock,
  CheckCircle,
  CalendarIcon,
  Store as StoreIcon,
  Settings,
  TrendingUp,
  Receipt,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Progress } from "@/components/ui/progress";
import { bookings, customers, products, groomers } from "@/lib/mock-data";
import { getDailyUsages, DailyUsage } from "@/lib/api/daily-usage";
import { getAdminBookings } from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getStores, ApiStore } from "@/lib/api/stores";
import {
  createStoreDailyCapacity,
  updateStoreDailyCapacity,
  getStoreDailyCapacities,
  deleteStoreDailyCapacity,
} from "@/lib/api/store-daily-capacity";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ── Transaction booking helpers ──────────────────────────────────────────────

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

type TxDatePreset = "today" | "week" | "month" | "custom" | "";

function getTxPresetRange(
  preset: TxDatePreset,
): { from: string; to: string } | null {
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
  return null;
}

function formatTxPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function formatTxDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TX_LIMIT = 10;

const txStatusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  waitlist: "bg-yellow-100 text-yellow-800",
  "driver on the way": "bg-blue-100 text-blue-800",
  "groomer on the way": "bg-blue-100 text-blue-800",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  returned: "bg-slate-100 text-slate-700",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusColors: Record<string, string> = {
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "not-confirmed": "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  "in-progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
};

export default function AdminDashboard() {
  const router = useRouter();

  const todayBookings = bookings.filter(
    (b) => b.date === "2026-02-07" || b.date === "2026-02-06",
  );
  const confirmedCount = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const pendingCount = bookings.filter(
    (b) => b.status === "not-confirmed",
  ).length;

  const stats = [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: CalendarDays,
      color: "text-primary",
    },
    {
      title: "Customers",
      value: customers.length,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Services",
      value: products.filter((p) => p.isActive).length,
      icon: Package,
      color: "text-accent-foreground",
    },
    {
      title: "Active Groomers",
      value: groomers.filter((g) => g.isActive).length,
      icon: Scissors,
      color: "text-secondary-foreground",
    },
  ];

  const { toast } = useToast();

  // Transaction booking states
  const [txBookings, setTxBookings] = useState<AdminBooking[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txDatePreset, setTxDatePreset] = useState<TxDatePreset>("today");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txCalFromOpen, setTxCalFromOpen] = useState(false);
  const [txCalToOpen, setTxCalToOpen] = useState(false);

  const txTotalPages = Math.max(1, Math.ceil(txTotal / TX_LIMIT));

  const fetchTxBookings = useCallback(
    (page: number) => {
      setTxLoading(true);
      const presetRange = getTxPresetRange(txDatePreset);
      const from =
        txDatePreset === "custom" ? txDateFrom : (presetRange?.from ?? "");
      const to = txDatePreset === "custom" ? txDateTo : (presetRange?.to ?? "");
      getAdminBookings({
        page,
        limit: TX_LIMIT,
        date_from: from || undefined,
        date_to: to || undefined,
      })
        .then((res) => {
          setTxBookings(res.bookings);
          setTxTotal(res.total ?? 0);
        })
        .catch(() => {})
        .finally(() => setTxLoading(false));
    },
    [txDatePreset, txDateFrom, txDateTo],
  );

  useEffect(() => {
    setTxPage(1);
  }, [txDatePreset, txDateFrom, txDateTo]);

  useEffect(() => {
    fetchTxBookings(txPage);
  }, [fetchTxBookings, txPage]);

  const txRevenue = txBookings.reduce(
    (sum, b) => sum + (b.final_total_price ?? 0),
    0,
  );

  function handleTxPreset(preset: TxDatePreset) {
    setTxDatePreset((prev) => (prev === preset ? "" : preset));
  }

  // Daily usage states
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyUsages, setDailyUsages] = useState<DailyUsage[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);
  const [currentCapacity, setCurrentCapacity] = useState<number | null>(null);

  // Capacity override modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStoreId, setModalStoreId] = useState<string>("");
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [capacityMinutes, setCapacityMinutes] = useState<string>("");
  const [capacityNotes, setCapacityNotes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasExistingOverride, setHasExistingOverride] = useState(false);
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [canRevertToDefault, setCanRevertToDefault] = useState(true);
  const [revertBlockReason, setRevertBlockReason] = useState<string>("");
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [currentUsedMinutes, setCurrentUsedMinutes] = useState<number>(0);

  // Fetch stores on mount and set default to primary store
  useEffect(() => {
    const fetchStores = async () => {
      setIsLoadingStores(true);
      try {
        const response = await getStores({
          page: 1,
          limit: 100,
          is_active: "true",
        });
        setStores(response.stores);

        // Find primary store (is_default_store) or first active store
        const primaryStore =
          response.stores.find((s: any) => s.is_default_store) ||
          response.stores[0];
        if (primaryStore) {
          setSelectedStoreId(primaryStore._id);
        }
      } catch (error) {
        console.error("Failed to fetch stores:", error);
      } finally {
        setIsLoadingStores(false);
      }
    };

    fetchStores();
  }, []);

  // Fetch daily usages when store or date changes
  useEffect(() => {
    if (!selectedStoreId) return;

    const fetchDailyUsages = async () => {
      setIsLoadingUsages(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await getDailyUsages({
          store_id: selectedStoreId,
          date: dateStr,
        });
        setDailyUsages(response.data);

        // If no usages returned, check for capacity override to display correct default
        if (response.data.length === 0) {
          try {
            const overrideResponse = await getStoreDailyCapacities({
              store_id: selectedStoreId,
              date: dateStr,
            });

            if (
              overrideResponse.capacities &&
              overrideResponse.capacities.length > 0
            ) {
              // Use override capacity
              setCurrentCapacity(
                overrideResponse.capacities[0].total_capacity_minutes,
              );
            } else {
              // Use default from store
              const selectedStore = stores.find(
                (s) => s._id === selectedStoreId,
              );
              setCurrentCapacity(
                selectedStore?.capacity?.default_daily_capacity_minutes || 960,
              );
            }
          } catch (error) {
            // Fallback to default
            const selectedStore = stores.find((s) => s._id === selectedStoreId);
            setCurrentCapacity(
              selectedStore?.capacity?.default_daily_capacity_minutes || 960,
            );
          }
        } else {
          // Use capacity from the returned usage data
          setCurrentCapacity(response.data[0]?.total_capacity_minutes || null);
        }
      } catch (error) {
        console.error("Failed to fetch daily usages:", error);
      } finally {
        setIsLoadingUsages(false);
      }
    };

    fetchDailyUsages();
  }, [selectedStoreId, selectedDate, stores]);

  // Helper to get usage color based on percentage
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-orange-500";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-orange-500";
    return "bg-green-600";
  };

  // Handle opening modal with pre-filled data
  const handleOpenModal = async () => {
    // Pre-fill with currently selected store and date
    setModalStoreId(selectedStoreId);
    setModalDate(selectedDate);

    try {
      // Check if there's an existing override for this store and date
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await getStoreDailyCapacities({
        store_id: selectedStoreId,
        date: dateStr,
      });

      if (response.capacities && response.capacities.length > 0) {
        // Use existing override
        const override = response.capacities[0];
        setCapacityMinutes(override.total_capacity_minutes.toString());
        setCapacityNotes(override.notes || "");
        setHasExistingOverride(true);
        setOverrideId(override._id);

        // Check if we can revert to default
        const selectedStore = stores.find((s) => s._id === selectedStoreId);
        const defaultCapacity =
          selectedStore?.capacity?.default_daily_capacity_minutes || 960;

        // Get current usage
        const currentUsage = dailyUsages.find(
          (u) => u.store_id === selectedStoreId,
        );
        const usedMinutes = currentUsage?.used_minutes || 0;
        setCurrentUsedMinutes(usedMinutes);

        if (usedMinutes > defaultCapacity) {
          setCanRevertToDefault(false);
          setRevertBlockReason(
            `Cannot revert: Current usage (${usedMinutes} min) exceeds default capacity (${defaultCapacity} min)`,
          );
        } else {
          setCanRevertToDefault(true);
          setRevertBlockReason("");
        }
      } else {
        // Use default from selected store
        const selectedStore = stores.find((s) => s._id === selectedStoreId);
        setCapacityMinutes(
          (
            selectedStore?.capacity?.default_daily_capacity_minutes || 960
          ).toString(),
        );
        setCapacityNotes("");
        setHasExistingOverride(false);
        setOverrideId(null);
        setCanRevertToDefault(true);
        setRevertBlockReason("");

        // Get current usage
        const currentUsage = dailyUsages.find(
          (u) => u.store_id === selectedStoreId,
        );
        const usedMinutes = currentUsage?.used_minutes || 0;
        setCurrentUsedMinutes(usedMinutes);
      }
    } catch (error) {
      console.error("Failed to fetch existing override:", error);
      // Fallback to default
      const selectedStore = stores.find((s) => s._id === selectedStoreId);
      setCapacityMinutes(
        (
          selectedStore?.capacity?.default_daily_capacity_minutes || 960
        ).toString(),
      );
      setCapacityNotes("");
      setHasExistingOverride(false);
      setOverrideId(null);
      setCanRevertToDefault(true);
      setRevertBlockReason("");

      // Get current usage
      const currentUsage = dailyUsages.find(
        (u) => u.store_id === selectedStoreId,
      );
      const usedMinutes = currentUsage?.used_minutes || 0;
      setCurrentUsedMinutes(usedMinutes);
    }

    setIsModalOpen(true);
  };

  // Handle saving capacity override
  const handleSaveCapacity = async () => {
    if (!modalStoreId) {
      toast({
        title: "Error",
        description: "Please select a store",
        variant: "destructive",
      });
      return;
    }

    if (!modalDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (!capacityMinutes || capacityMinutes.trim() === "") {
      toast({
        title: "Error",
        description: "Capacity cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const minutes = parseInt(capacityMinutes);
    if (isNaN(minutes) || minutes < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid capacity in minutes (0 or greater)",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const dateStr = format(modalDate, "yyyy-MM-dd");

      // Check if capacity is less than current usage
      const usageResponse = await getDailyUsages({
        store_id: modalStoreId,
        date: dateStr,
      });

      const usedMinutes = usageResponse.data[0]?.used_minutes || 0;

      // Allow 0 capacity only when there's no usage yet
      if (minutes === 0 && usedMinutes > 0) {
        toast({
          title: "Error",
          description: `Cannot set capacity to 0. There is already ${usedMinutes} minutes of usage on this date.`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      if (usedMinutes > minutes) {
        toast({
          title: "Error",
          description: `Cannot set capacity to ${minutes} minutes. Current usage (${usedMinutes} min) exceeds this capacity.`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      await createStoreDailyCapacity({
        store_id: modalStoreId,
        date: dateStr,
        total_capacity_minutes: minutes,
        notes: capacityNotes.trim() || undefined,
      });

      toast({
        title: "Success",
        description: "Daily capacity override saved successfully",
      });

      setIsModalOpen(false);

      // Update current capacity immediately for UI feedback
      setCurrentCapacity(minutes);

      // Update filter to the saved store and date
      setSelectedStoreId(modalStoreId);
      setSelectedDate(modalDate);

      // If there's existing usage data and we're updating the same store/date,
      // update the dailyUsages state immediately for instant UI update
      if (dailyUsages.length > 0) {
        const updatedUsages = dailyUsages.map((usage) => {
          const rawPercentage =
            minutes > 0 ? (usage.used_minutes / minutes) * 100 : 0;
          const percentage = Math.floor(rawPercentage * 100) / 100;
          return {
            ...usage,
            total_capacity_minutes: minutes,
            remaining_minutes: Math.max(0, minutes - usage.used_minutes),
            usage_percentage: percentage,
            is_overbooked: usage.used_minutes > minutes,
            has_capacity_override: true,
            capacity_notes: capacityNotes.trim() || null,
          };
        });
        setDailyUsages(updatedUsages);
      }

      // useEffect will automatically fetch the latest data from backend
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save capacity override",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reverting to default capacity
  const handleRevertToDefault = () => {
    // Show confirmation dialog
    setShowRevertConfirm(true);
  };

  // Confirm and execute revert to default
  const confirmRevertToDefault = async () => {
    if (!overrideId) {
      toast({
        title: "Error",
        description: "No capacity override found to revert",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStoreDailyCapacity(overrideId);

      toast({
        title: "Success",
        description: "Reverted to default capacity successfully",
      });

      setShowRevertConfirm(false);
      setIsModalOpen(false);

      // Get default capacity from store
      const selectedStore = stores.find((s) => s._id === modalStoreId);
      const defaultCapacity =
        selectedStore?.capacity?.default_daily_capacity_minutes || 960;

      // Update current capacity immediately
      setCurrentCapacity(defaultCapacity);

      // Update filter to ensure we're viewing the correct store/date
      setSelectedStoreId(modalStoreId);
      setSelectedDate(modalDate);

      // Update dailyUsages state immediately if there's data
      if (dailyUsages.length > 0) {
        const updatedUsages = dailyUsages.map((usage) => {
          const rawPercentage =
            defaultCapacity > 0
              ? (usage.used_minutes / defaultCapacity) * 100
              : 0;
          const percentage = Math.floor(rawPercentage * 100) / 100;
          return {
            ...usage,
            total_capacity_minutes: defaultCapacity,
            remaining_minutes: Math.max(
              0,
              defaultCapacity - usage.used_minutes,
            ),
            usage_percentage: percentage,
            is_overbooked: usage.used_minutes > defaultCapacity,
            has_capacity_override: false,
            capacity_notes: null,
          };
        });
        setDailyUsages(updatedUsages);
      }

      // useEffect will automatically fetch the latest data from backend
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to revert capacity override",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get display data - if no usage data exists, create default with 0%
  const getDisplayUsages = (): DailyUsage[] => {
    if (dailyUsages.length > 0) {
      return dailyUsages;
    }

    // If no data and store is selected, create default usage
    if (!selectedStoreId || stores.length === 0) {
      return [];
    }

    const selectedStore = stores.find((s) => s._id === selectedStoreId);
    if (!selectedStore) {
      return [];
    }

    // Create default usage with 0 values
    // Use currentCapacity which includes override if exists
    const totalCapacity =
      currentCapacity !== null
        ? currentCapacity
        : selectedStore.capacity?.default_daily_capacity_minutes || 960;

    const defaultOverbooking =
      selectedStore.capacity?.overbooking_limit_minutes || 120;

    return [
      {
        _id: "default",
        store_id: selectedStore._id,
        store_name: selectedStore.name,
        store_code: selectedStore.code,
        date: selectedDate.toISOString(),
        used_minutes: 0,
        total_capacity_minutes: totalCapacity,
        remaining_minutes: totalCapacity,
        overbooking_limit_minutes: defaultOverbooking,
        max_capacity_minutes: totalCapacity + defaultOverbooking,
        usage_percentage: 0,
        is_overbooked: false,
        is_at_capacity: false,
        has_capacity_override:
          currentCapacity !== null &&
          currentCapacity !==
            (selectedStore.capacity?.default_daily_capacity_minutes || 960),
        capacity_notes: null,
      },
    ];
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your pet grooming business
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="font-display text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Daily Capacity Usage Section */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg font-bold">
              Daily Capacity Usage
            </CardTitle>
            <Button
              onClick={handleOpenModal}
              disabled={!selectedStoreId || isLoadingStores}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Override Capacity
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Store
              </label>
              <Combobox
                options={stores.map((store) => ({
                  label: `${store.name} (${store.code})`,
                  value: store._id,
                }))}
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
                placeholder="Select store"
                emptyText="No stores found"
                disabled={isLoadingStores}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-8 text-xs",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Usage Data */}
          {isLoadingUsages ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Loading usage data...
              </div>
            </div>
          ) : (
            getDisplayUsages().map((usage) => (
              <div
                key={usage._id}
                className="rounded-lg border border-border/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {usage.store_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(usage.date), "PPP")}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        getUsageColor(usage.usage_percentage),
                      )}
                    >
                      {usage.usage_percentage.toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {usage.used_minutes}/{usage.total_capacity_minutes} min
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Capacity Usage
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        getUsageColor(usage.usage_percentage),
                      )}
                    >
                      {usage.remaining_minutes} min remaining
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all",
                        getProgressColor(usage.usage_percentage),
                      )}
                      style={{
                        width: `${Math.min(usage.usage_percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {usage.is_at_capacity && (
                    <Badge variant="destructive" className="text-xs">
                      At Capacity
                    </Badge>
                  )}
                  {usage.is_overbooked && !usage.is_at_capacity && (
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 text-xs"
                    >
                      Overbooked
                    </Badge>
                  )}
                  {usage.has_capacity_override && (
                    <Badge variant="outline" className="text-xs">
                      Custom Capacity
                    </Badge>
                  )}
                  {!usage.is_overbooked && usage.usage_percentage < 70 && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 text-xs"
                    >
                      Available
                    </Badge>
                  )}
                </div>

                {usage.capacity_notes && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Note:</span>{" "}
                      {usage.capacity_notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {/* Transaction Booking Section */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold">
            Transaksi Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Preset buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={txDatePreset === "today" ? "default" : "outline"}
              onClick={() => handleTxPreset("today")}
            >
              Hari Ini
            </Button>
            <Button
              size="sm"
              variant={txDatePreset === "week" ? "default" : "outline"}
              onClick={() => handleTxPreset("week")}
            >
              Minggu Ini
            </Button>
            <Button
              size="sm"
              variant={txDatePreset === "month" ? "default" : "outline"}
              onClick={() => handleTxPreset("month")}
            >
              Bulan Ini
            </Button>
            <Button
              size="sm"
              variant={txDatePreset === "custom" ? "default" : "outline"}
              onClick={() => handleTxPreset("custom")}
            >
              Custom
            </Button>
          </div>

          {/* Custom date range — shown below when Custom is active */}
          {txDatePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={txCalFromOpen} onOpenChange={setTxCalFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-[180px] justify-start text-xs gap-1.5",
                      !txDateFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {txDateFrom
                      ? format(new Date(txDateFrom), "dd MMM yyyy")
                      : "Dari tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={txDateFrom ? new Date(txDateFrom) : undefined}
                    onSelect={(d) => {
                      if (d) setTxDateFrom(toYMD(d));
                      setTxCalFromOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">s/d</span>

              <Popover open={txCalToOpen} onOpenChange={setTxCalToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-[180px] justify-start text-xs gap-1.5",
                      !txDateTo && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {txDateTo
                      ? format(new Date(txDateTo), "dd MMM yyyy")
                      : "Sampai tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={txDateTo ? new Date(txDateTo) : undefined}
                    onSelect={(d) => {
                      if (d) setTxDateTo(toYMD(d));
                      setTxCalToOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(txDateFrom || txDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setTxDateFrom("");
                    setTxDateTo("");
                  }}
                  title="Reset tanggal"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Booking</p>
                {txLoading ? (
                  <Skeleton className="h-6 w-12 mt-0.5" />
                ) : (
                  <p className="font-display text-xl font-bold text-foreground">
                    {txTotal}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/20">
                <TrendingUp className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Pendapatan
                </p>
                {txLoading ? (
                  <Skeleton className="h-6 w-28 mt-0.5" />
                ) : (
                  <p className="font-display text-xl font-bold text-foreground">
                    {formatTxPrice(txRevenue)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bookings table */}
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tanggal</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Hewan</TableHead>
                  <TableHead className="text-xs">Layanan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : txBookings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      Tidak ada booking pada periode ini
                    </TableCell>
                  </TableRow>
                ) : (
                  txBookings.map((b) => (
                    <TableRow
                      key={b._id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => router.push(`/admin/bookings/${b._id}`)}
                    >
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatTxDate(b.date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.customer?.username ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.pet_snapshot.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.service_snapshot.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            txStatusColors[b.booking_status] ??
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {b.booking_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium whitespace-nowrap">
                        {formatTxPrice(b.final_total_price)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {txTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">
                Halaman {txPage} dari {txTotalPages} ({txTotal} booking)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={txPage <= 1}
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={txPage >= txTotalPages}
                  onClick={() =>
                    setTxPage((p) => Math.min(txTotalPages, p + 1))
                  }
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats and Recent Bookings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Confirmed Bookings
                </span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                {confirmedCount}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-accent-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Pending Confirmation
                </span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                {pendingCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {todayBookings.slice(0, 4).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {booking.petName} ({booking.customerName})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {booking.serviceName} - {booking.timeStart}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={statusColors[booking.status]}
                >
                  {booking.status.replace("-", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {/* Capacity Override Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Override Daily Capacity</DialogTitle>
            <DialogDescription>
              Set a custom capacity for a specific store and date
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="store">Store</Label>
              <Combobox
                options={stores.map((store) => ({
                  label: `${store.name} (${store.code})`,
                  value: store._id,
                }))}
                value={modalStoreId}
                onValueChange={async (value) => {
                  setModalStoreId(value);

                  try {
                    // Check for existing override with new store and current date
                    const dateStr = format(modalDate, "yyyy-MM-dd");
                    const response = await getStoreDailyCapacities({
                      store_id: value,
                      date: dateStr,
                    });

                    if (response.capacities && response.capacities.length > 0) {
                      const override = response.capacities[0];
                      setCapacityMinutes(
                        override.total_capacity_minutes.toString(),
                      );
                      setCapacityNotes(override.notes || "");
                      setHasExistingOverride(true);
                      setOverrideId(override._id);

                      // Check if we can revert to default
                      const store = stores.find((s) => s._id === value);
                      const defaultCapacity =
                        store?.capacity?.default_daily_capacity_minutes || 960;

                      // Get current usage for this store/date combination
                      const usageResponse = await getDailyUsages({
                        store_id: value,
                        date: dateStr,
                      });
                      const usedMinutes =
                        usageResponse.data[0]?.used_minutes || 0;
                      setCurrentUsedMinutes(usedMinutes);

                      if (usedMinutes > defaultCapacity) {
                        setCanRevertToDefault(false);
                        setRevertBlockReason(
                          `Cannot revert: Current usage (${usedMinutes} min) exceeds default capacity (${defaultCapacity} min)`,
                        );
                      } else {
                        setCanRevertToDefault(true);
                        setRevertBlockReason("");
                      }
                    } else {
                      // Use default from new store
                      const store = stores.find((s) => s._id === value);
                      setCapacityMinutes(
                        (
                          store?.capacity?.default_daily_capacity_minutes || 960
                        ).toString(),
                      );
                      setCapacityNotes("");
                      setHasExistingOverride(false);
                      setOverrideId(null);
                      setCanRevertToDefault(true);
                      setRevertBlockReason("");

                      // Get current usage for new store
                      const usageResponse = await getDailyUsages({
                        store_id: value,
                        date: dateStr,
                      });
                      const usedMinutes =
                        usageResponse.data[0]?.used_minutes || 0;
                      setCurrentUsedMinutes(usedMinutes);
                    }
                  } catch (error) {
                    // Fallback to default
                    const store = stores.find((s) => s._id === value);
                    setCapacityMinutes(
                      (
                        store?.capacity?.default_daily_capacity_minutes || 960
                      ).toString(),
                    );
                    setCapacityNotes("");
                    setHasExistingOverride(false);
                    setOverrideId(null);
                    setCanRevertToDefault(true);
                    setRevertBlockReason("");
                    setCurrentUsedMinutes(0);
                  }
                }}
                placeholder="Select store"
                emptyText="No stores found"
                className="h-9"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !modalDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {modalDate ? (
                      format(modalDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={modalDate}
                    onSelect={async (date) => {
                      if (!date) return;
                      setModalDate(date);

                      try {
                        // Check for existing override with current store and new date
                        const dateStr = format(date, "yyyy-MM-dd");
                        const response = await getStoreDailyCapacities({
                          store_id: modalStoreId,
                          date: dateStr,
                        });

                        if (
                          response.capacities &&
                          response.capacities.length > 0
                        ) {
                          const override = response.capacities[0];
                          setCapacityMinutes(
                            override.total_capacity_minutes.toString(),
                          );
                          setCapacityNotes(override.notes || "");
                          setHasExistingOverride(true);
                          setOverrideId(override._id);

                          // Check if we can revert to default
                          const store = stores.find(
                            (s) => s._id === modalStoreId,
                          );
                          const defaultCapacity =
                            store?.capacity?.default_daily_capacity_minutes ||
                            960;

                          // Get current usage for this store/date combination
                          const usageResponse = await getDailyUsages({
                            store_id: modalStoreId,
                            date: dateStr,
                          });
                          const usedMinutes =
                            usageResponse.data[0]?.used_minutes || 0;
                          setCurrentUsedMinutes(usedMinutes);

                          if (usedMinutes > defaultCapacity) {
                            setCanRevertToDefault(false);
                            setRevertBlockReason(
                              `Cannot revert: Current usage (${usedMinutes} min) exceeds default capacity (${defaultCapacity} min)`,
                            );
                          } else {
                            setCanRevertToDefault(true);
                            setRevertBlockReason("");
                          }
                        } else {
                          // Use default from store
                          const store = stores.find(
                            (s) => s._id === modalStoreId,
                          );
                          setCapacityMinutes(
                            (
                              store?.capacity?.default_daily_capacity_minutes ||
                              960
                            ).toString(),
                          );
                          setCapacityNotes("");
                          setHasExistingOverride(false);
                          setOverrideId(null);
                          setCanRevertToDefault(true);
                          setRevertBlockReason("");

                          // Get current usage for new date
                          const usageResponse = await getDailyUsages({
                            store_id: modalStoreId,
                            date: dateStr,
                          });
                          const usedMinutes =
                            usageResponse.data[0]?.used_minutes || 0;
                          setCurrentUsedMinutes(usedMinutes);
                        }
                      } catch (error) {
                        // Fallback to default
                        const store = stores.find(
                          (s) => s._id === modalStoreId,
                        );
                        setCapacityMinutes(
                          (
                            store?.capacity?.default_daily_capacity_minutes ||
                            960
                          ).toString(),
                        );
                        setCapacityNotes("");
                        setHasExistingOverride(false);
                        setOverrideId(null);
                        setCanRevertToDefault(true);
                        setRevertBlockReason("");
                        setCurrentUsedMinutes(0);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Total Capacity (minutes)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="960"
                value={capacityMinutes}
                onChange={(e) => setCapacityMinutes(e.target.value)}
                min="0"
                step="30"
                className={
                  !capacityMinutes ||
                  capacityMinutes.trim() === "" ||
                  (currentUsedMinutes > 0 &&
                    parseInt(capacityMinutes) > 0 &&
                    parseInt(capacityMinutes) < currentUsedMinutes) ||
                  (currentUsedMinutes > 0 && parseInt(capacityMinutes) === 0)
                    ? "border-destructive"
                    : ""
                }
              />
              <div className="space-y-1">
                {(!capacityMinutes || capacityMinutes.trim() === "") && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Capacity cannot be empty
                  </p>
                )}
                {currentUsedMinutes > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Current usage: {currentUsedMinutes} minutes
                  </p>
                )}
                {currentUsedMinutes > 0 && parseInt(capacityMinutes) === 0 && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Cannot set capacity to 0 when there is already usage (
                    {currentUsedMinutes} min)
                  </p>
                )}
                {currentUsedMinutes > 0 &&
                  parseInt(capacityMinutes) > 0 &&
                  parseInt(capacityMinutes) < currentUsedMinutes && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Cannot set capacity below current usage (
                      {currentUsedMinutes} min)
                    </p>
                  )}
                {currentUsedMinutes === 0 &&
                  parseInt(capacityMinutes) === 0 && (
                    <p className="text-xs text-blue-600 font-medium">
                      ℹ️ Setting capacity to 0 will prevent new bookings for
                      this date
                    </p>
                  )}
                <p className="text-xs text-muted-foreground">
                  {hasExistingOverride ? (
                    <span className="text-orange-600 font-medium">
                      Currently using custom capacity override
                    </span>
                  ) : (
                    <>
                      Store default:{" "}
                      {stores.find((s) => s._id === modalStoreId)?.capacity
                        ?.default_daily_capacity_minutes || 960}{" "}
                      minutes
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Reason for capacity override..."
                value={capacityNotes}
                onChange={(e) => setCapacityNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {hasExistingOverride && (
              <div className="flex flex-col gap-1 sm:mr-auto">
                <Button
                  variant="destructive"
                  onClick={handleRevertToDefault}
                  disabled={isSaving || isDeleting || !canRevertToDefault}
                >
                  {isDeleting ? "Reverting..." : "Revert to Default"}
                </Button>
                {!canRevertToDefault && revertBlockReason && (
                  <p className="text-xs text-destructive mt-1">
                    {revertBlockReason}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCapacity}
                disabled={
                  isSaving ||
                  isDeleting ||
                  !capacityMinutes ||
                  capacityMinutes.trim() === "" ||
                  (currentUsedMinutes > 0 &&
                    parseInt(capacityMinutes) > 0 &&
                    parseInt(capacityMinutes) < currentUsedMinutes) ||
                  (currentUsedMinutes > 0 && parseInt(capacityMinutes) === 0)
                }
              >
                {isSaving ? "Saving..." : "Save Override"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Revert Confirmation Dialog */}
      <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Default Capacity?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You are about to revert the capacity override for:</p>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <div>
                    <span className="font-semibold">Store:</span>{" "}
                    {stores.find((s) => s._id === modalStoreId)?.name ||
                      "Unknown"}
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span>{" "}
                    {format(modalDate, "PPP")}
                  </div>
                  <div>
                    <span className="font-semibold">Default Capacity:</span>{" "}
                    {stores.find((s) => s._id === modalStoreId)?.capacity
                      ?.default_daily_capacity_minutes || 960}{" "}
                    minutes
                  </div>
                </div>
                <p className="text-foreground font-medium pt-2">
                  This will remove the custom capacity override and use the
                  store&apos;s default capacity settings.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevertToDefault}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Reverting..." : "Revert to Default"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
