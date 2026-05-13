"use client";

import { useEffect, useState } from "react";
import { getStores, type ApiStore } from "@/lib/api/stores";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BranchFilter() {
  const { storeId, setStoreId } = useDashboardFilters();
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStores({ page: 1, limit: 100, is_active: "true" })
      .then((res) => {
        if (!cancelled) setStores(res.stores);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select value={storeId} onValueChange={setStoreId} disabled={loading}>
      <SelectTrigger className="h-8 w-[180px] text-xs">
        <SelectValue placeholder="Pilih cabang" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua cabang</SelectItem>
        {stores.map((s) => (
          <SelectItem key={s._id} value={s._id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
