"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, Settings } from "lucide-react";
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
import { getStores, ApiStore } from "@/lib/api/stores";
import { getDailyUsages, DailyUsage } from "@/lib/api/daily-usage";
import {
  createStoreDailyCapacity,
  getStoreDailyCapacities,
  deleteStoreDailyCapacity,
} from "@/lib/api/store-daily-capacity";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function DailyCapacitySection() {
  const { toast } = useToast();

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

  useEffect(() => {
    setIsLoadingStores(true);
    getStores({ page: 1, limit: 100, is_active: "true" })
      .then((res) => {
        setStores(res.stores);
        const primary =
          res.stores.find((s: any) => s.is_default_store) || res.stores[0];
        if (primary) setSelectedStoreId(primary._id);
      })
      .catch((err) => console.error("Failed to fetch stores:", err))
      .finally(() => setIsLoadingStores(false));
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    setIsLoadingUsages(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    getDailyUsages({ store_id: selectedStoreId, date: dateStr })
      .then(async (res) => {
        setDailyUsages(res.data);
        if (res.data.length === 0) {
          try {
            const overrideRes = await getStoreDailyCapacities({
              store_id: selectedStoreId,
              date: dateStr,
            });
            if (overrideRes.capacities?.length > 0) {
              setCurrentCapacity(
                overrideRes.capacities[0].total_capacity_minutes,
              );
            } else {
              const store = stores.find((s) => s._id === selectedStoreId);
              setCurrentCapacity(
                store?.capacity?.default_daily_capacity_minutes || 960,
              );
            }
          } catch {
            const store = stores.find((s) => s._id === selectedStoreId);
            setCurrentCapacity(
              store?.capacity?.default_daily_capacity_minutes || 960,
            );
          }
        } else {
          setCurrentCapacity(res.data[0]?.total_capacity_minutes || null);
        }
      })
      .catch((err) => console.error("Failed to fetch daily usages:", err))
      .finally(() => setIsLoadingUsages(false));
  }, [selectedStoreId, selectedDate, stores]);

  const getUsageColor = (p: number) => {
    if (p >= 90) return "text-destructive";
    if (p >= 70) return "text-orange-500";
    return "text-green-600";
  };

  const getProgressColor = (p: number) => {
    if (p >= 90) return "bg-destructive";
    if (p >= 70) return "bg-orange-500";
    return "bg-green-600";
  };

  const getDisplayUsages = (): DailyUsage[] => {
    if (dailyUsages.length > 0) return dailyUsages;
    if (!selectedStoreId || stores.length === 0) return [];
    const store = stores.find((s) => s._id === selectedStoreId);
    if (!store) return [];
    const totalCapacity =
      currentCapacity !== null
        ? currentCapacity
        : store.capacity?.default_daily_capacity_minutes || 960;
    const defaultOverbooking = store.capacity?.overbooking_limit_minutes || 120;
    return [
      {
        _id: "default",
        store_id: store._id,
        store_name: store.name,
        store_code: store.code,
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
            (store.capacity?.default_daily_capacity_minutes || 960),
        capacity_notes: null,
      },
    ];
  };

  const handleOpenModal = async () => {
    setModalStoreId(selectedStoreId);
    setModalDate(selectedDate);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const res = await getStoreDailyCapacities({
        store_id: selectedStoreId,
        date: dateStr,
      });
      const currentUsage = dailyUsages.find(
        (u) => u.store_id === selectedStoreId,
      );
      const usedMinutes = currentUsage?.used_minutes || 0;
      setCurrentUsedMinutes(usedMinutes);
      if (res.capacities?.length > 0) {
        const override = res.capacities[0];
        setCapacityMinutes(override.total_capacity_minutes.toString());
        setCapacityNotes(override.notes || "");
        setHasExistingOverride(true);
        setOverrideId(override._id);
        const store = stores.find((s) => s._id === selectedStoreId);
        const defaultCap =
          store?.capacity?.default_daily_capacity_minutes || 960;
        if (usedMinutes > defaultCap) {
          setCanRevertToDefault(false);
          setRevertBlockReason(
            `Cannot revert: Current usage (${usedMinutes} min) exceeds default capacity (${defaultCap} min)`,
          );
        } else {
          setCanRevertToDefault(true);
          setRevertBlockReason("");
        }
      } else {
        const store = stores.find((s) => s._id === selectedStoreId);
        setCapacityMinutes(
          (store?.capacity?.default_daily_capacity_minutes || 960).toString(),
        );
        setCapacityNotes("");
        setHasExistingOverride(false);
        setOverrideId(null);
        setCanRevertToDefault(true);
        setRevertBlockReason("");
      }
    } catch {
      const store = stores.find((s) => s._id === selectedStoreId);
      setCapacityMinutes(
        (store?.capacity?.default_daily_capacity_minutes || 960).toString(),
      );
      setCapacityNotes("");
      setHasExistingOverride(false);
      setOverrideId(null);
      setCanRevertToDefault(true);
      setRevertBlockReason("");
      setCurrentUsedMinutes(0);
    }
    setIsModalOpen(true);
  };

  const handleSaveCapacity = async () => {
    if (!modalStoreId) {
      toast({
        title: "Error",
        description: "Please select a store",
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
      const usageRes = await getDailyUsages({
        store_id: modalStoreId,
        date: dateStr,
      });
      const usedMinutes = usageRes.data[0]?.used_minutes || 0;
      if (minutes === 0 && usedMinutes > 0) {
        toast({
          title: "Error",
          description: `Cannot set capacity to 0. There is already ${usedMinutes} minutes of usage.`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      if (usedMinutes > minutes) {
        toast({
          title: "Error",
          description: `Cannot set capacity to ${minutes} min. Current usage (${usedMinutes} min) exceeds this.`,
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
      setCurrentCapacity(minutes);
      setSelectedStoreId(modalStoreId);
      setSelectedDate(modalDate);
      if (dailyUsages.length > 0) {
        setDailyUsages(
          dailyUsages.map((u) => ({
            ...u,
            total_capacity_minutes: minutes,
            remaining_minutes: Math.max(0, minutes - u.used_minutes),
            usage_percentage:
              Math.floor(
                (minutes > 0 ? (u.used_minutes / minutes) * 100 : 0) * 100,
              ) / 100,
            is_overbooked: u.used_minutes > minutes,
            has_capacity_override: true,
            capacity_notes: capacityNotes.trim() || null,
          })),
        );
      }
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
      const store = stores.find((s) => s._id === modalStoreId);
      const defaultCap = store?.capacity?.default_daily_capacity_minutes || 960;
      setCurrentCapacity(defaultCap);
      setSelectedStoreId(modalStoreId);
      setSelectedDate(modalDate);
      if (dailyUsages.length > 0) {
        setDailyUsages(
          dailyUsages.map((u) => ({
            ...u,
            total_capacity_minutes: defaultCap,
            remaining_minutes: Math.max(0, defaultCap - u.used_minutes),
            usage_percentage:
              Math.floor(
                (defaultCap > 0 ? (u.used_minutes / defaultCap) * 100 : 0) *
                  100,
              ) / 100,
            is_overbooked: u.used_minutes > defaultCap,
            has_capacity_override: false,
            capacity_notes: null,
          })),
        );
      }
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

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="font-display text-lg font-bold">
              Daily Capacity Usage
            </CardTitle>
            <Button
              onClick={handleOpenModal}
              disabled={!selectedStoreId || isLoadingStores}
              size="sm"
              variant="outline"
              className="w-full shrink-0 gap-2 sm:w-auto"
            >
              <Settings className="h-4 w-4 shrink-0" />
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
                options={stores.map((s) => ({
                  label: `${s.name} (${s.code})`,
                  value: s._id,
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
                    variant="outline"
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
                    onSelect={(d) => d && setSelectedDate(d)}
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

      {/* Override Modal */}
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
              <Label>Store</Label>
              <Combobox
                options={stores.map((s) => ({
                  label: `${s.name} (${s.code})`,
                  value: s._id,
                }))}
                value={modalStoreId}
                onValueChange={async (value) => {
                  setModalStoreId(value);
                  const dateStr = format(modalDate, "yyyy-MM-dd");
                  try {
                    const res = await getStoreDailyCapacities({
                      store_id: value,
                      date: dateStr,
                    });
                    const usageRes = await getDailyUsages({
                      store_id: value,
                      date: dateStr,
                    });
                    const usedMinutes = usageRes.data[0]?.used_minutes || 0;
                    setCurrentUsedMinutes(usedMinutes);
                    if (res.capacities?.length > 0) {
                      const o = res.capacities[0];
                      setCapacityMinutes(o.total_capacity_minutes.toString());
                      setCapacityNotes(o.notes || "");
                      setHasExistingOverride(true);
                      setOverrideId(o._id);
                      const store = stores.find((s) => s._id === value);
                      const defaultCap =
                        store?.capacity?.default_daily_capacity_minutes || 960;
                      setCanRevertToDefault(usedMinutes <= defaultCap);
                      setRevertBlockReason(
                        usedMinutes > defaultCap
                          ? `Cannot revert: Current usage (${usedMinutes} min) exceeds default capacity (${defaultCap} min)`
                          : "",
                      );
                    } else {
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
                    }
                  } catch {
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
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
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
                      const dateStr = format(date, "yyyy-MM-dd");
                      try {
                        const res = await getStoreDailyCapacities({
                          store_id: modalStoreId,
                          date: dateStr,
                        });
                        const usageRes = await getDailyUsages({
                          store_id: modalStoreId,
                          date: dateStr,
                        });
                        const usedMinutes = usageRes.data[0]?.used_minutes || 0;
                        setCurrentUsedMinutes(usedMinutes);
                        if (res.capacities?.length > 0) {
                          const o = res.capacities[0];
                          setCapacityMinutes(
                            o.total_capacity_minutes.toString(),
                          );
                          setCapacityNotes(o.notes || "");
                          setHasExistingOverride(true);
                          setOverrideId(o._id);
                          const store = stores.find(
                            (s) => s._id === modalStoreId,
                          );
                          const defaultCap =
                            store?.capacity?.default_daily_capacity_minutes ||
                            960;
                          setCanRevertToDefault(usedMinutes <= defaultCap);
                          setRevertBlockReason(
                            usedMinutes > defaultCap
                              ? `Cannot revert: Current usage (${usedMinutes} min) exceeds default capacity (${defaultCap} min)`
                              : "",
                          );
                        } else {
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
                        }
                      } catch {
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
                  onClick={() => setShowRevertConfirm(true)}
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

      {/* Revert Confirmation */}
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
    </>
  );
}
