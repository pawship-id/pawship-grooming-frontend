"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { ParentItem } from "@/lib/api/bookings";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepNotesPaymentProps {
  form: {
    note: string;
    parent_items: ParentItem[];
    payment_method: string;
    referal_code: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  customPaymentMethod: string;
  setCustomPaymentMethod: (v: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepNotesPayment({
  form,
  setForm,
  customPaymentMethod,
  setCustomPaymentMethod,
}: StepNotesPaymentProps) {
  const parentItems = form.parent_items ?? [];

  const updateItemAt = (idx: number, patch: Partial<ParentItem>) => {
    setForm((p: any) => ({
      ...p,
      parent_items: (p.parent_items ?? []).map((it: ParentItem, i: number) =>
        i === idx ? { ...it, ...patch } : it,
      ),
    }));
  };

  const addItem = () => {
    setForm((p: any) => ({
      ...p,
      parent_items: [
        ...(p.parent_items ?? []),
        { item: "", item_in: false, item_out: false },
      ],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((p: any) => ({
      ...p,
      parent_items: (p.parent_items ?? []).filter(
        (_: ParentItem, i: number) => i !== idx,
      ),
    }));
  };

  return (
    <Card className="border-border/50">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Catatan (opsional)</Label>
          <Textarea
            id="note"
            placeholder="Permintaan khusus atau catatan mengenai hewan..."
            rows={3}
            value={form.note}
            onChange={(e) =>
              setForm((p: any) => ({ ...p, note: e.target.value }))
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>List Barang Bawaan Pawrents (opsional)</Label>
          <p className="text-xs text-muted-foreground">
            Tambahkan tiap barang yang dibawa supaya groomer mudah mencocokkan
            saat anabul masuk & keluar.
          </p>
          <div className="flex flex-col gap-2">
            {parentItems.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Nama barang (contoh: Tas carrier biru)"
                  value={it.item}
                  onChange={(e) =>
                    updateItemAt(idx, { item: e.target.value })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(idx)}
                  aria-label="Hapus barang"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-dashed text-primary hover:text-primary"
            onClick={addItem}
          >
            <Plus className="h-4 w-4" />
            Tambah Barang Titipan
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Metode Pembayaran (opsional)</Label>
            <Select
              value={form.payment_method}
              onValueChange={(v) =>
                setForm((p: any) => ({ ...p, payment_method: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih metode pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="card">Kartu Debit/Kredit</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            {form.payment_method === "other" && (
              <Input
                placeholder="Tulis metode pembayaran..."
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="referal_code">Referral Code (opsional)</Label>
            <Input
              id="referal_code"
              placeholder="FRIEND20"
              value={form.referal_code}
              onChange={(e) =>
                setForm((p: any) => ({ ...p, referal_code: e.target.value }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
