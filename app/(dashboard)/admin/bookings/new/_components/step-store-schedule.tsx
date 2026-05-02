"use client";

import { CalendarDays, Clock, MapPin, Phone } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailRow } from "@/components/booking/detail-row";
import type { ApiStore } from "@/lib/api/stores";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepStoreScheduleProps {
  form: {
    store_id: string;
    type: string;
    date: string;
    time_range: string;
    service_type_id: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  stores: ApiStore[];
  selectedStore: ApiStore | undefined;
  sessions: string[];
  loadingInit: boolean;
  loadingStore: boolean;
  handleStoreChange: (storeId: string) => void;
  fetchServices: (
    storeId: string,
    typeId: string,
    locationType?: string,
  ) => Promise<void>;
  resetServiceState: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepStoreSchedule({
  form,
  setForm,
  stores,
  selectedStore,
  sessions,
  loadingInit,
  loadingStore,
  handleStoreChange,
  fetchServices,
  resetServiceState,
}: StepStoreScheduleProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex flex-col gap-5 pt-6">
        {/* Store & Location Type in 2 columns */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Store */}
          <div className="flex flex-col gap-2">
            <Label>Store</Label>
            <Select
              value={form.store_id}
              onValueChange={handleStoreChange}
              disabled={loadingInit}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingInit ? "Memuat..." : "Pilih store"}
                />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Type */}
          <div className="flex flex-col gap-2">
            <Label>Lokasi Layanan</Label>
            <Select
              value={form.type}
              onValueChange={async (v) => {
                setForm((p: any) => ({ ...p, type: v, service_id: "" }));
                resetServiceState();
                if (form.store_id && form.service_type_id) {
                  await fetchServices(form.store_id, form.service_type_id, v);
                }
              }}
              disabled={!form.store_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !form.store_id ? "Pilih store dulu" : "Pilih lokasi"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in home">Home Service</SelectItem>
                <SelectItem value="in store">In Store</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Store Details */}
        {selectedStore && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
            {selectedStore.location?.address && (
              <DetailRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Alamat"
                value={[
                  selectedStore.location.address,
                  selectedStore.location.city,
                  selectedStore.location.province,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}
            {selectedStore.operational?.opening_time &&
              selectedStore.operational?.closing_time && (
                <DetailRow
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="Jam Buka"
                  value={`${selectedStore.operational.opening_time} – ${selectedStore.operational.closing_time}`}
                />
              )}
            {selectedStore.operational?.operational_days &&
              selectedStore.operational.operational_days.length > 0 && (
                <DetailRow
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Hari Buka"
                  value={selectedStore.operational.operational_days.join(", ")}
                />
              )}
            {selectedStore.contact?.phone_number && (
              <DetailRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Telepon"
                value={selectedStore.contact.phone_number}
              />
            )}
            {selectedStore.contact?.whatsapp && (
              <DetailRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="WhatsApp"
                value={selectedStore.contact.whatsapp}
              />
            )}
          </div>
        )}

        {/* Date & Session */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) =>
                setForm((p: any) => ({ ...p, date: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Sesi Waktu</Label>
            <Select
              value={form.time_range}
              onValueChange={(v) =>
                setForm((p: any) => ({ ...p, time_range: v }))
              }
              disabled={sessions.length === 0 || loadingStore}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingStore
                      ? "Memuat..."
                      : selectedStore === undefined 
                      ? "Pilih store dulu"
                      : sessions.length === 0
                        ? "Sesi tidak tersedia"
                        : "Pilih sesi"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
