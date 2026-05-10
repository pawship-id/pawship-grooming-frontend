"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepNotesPaymentProps {
  form: {
    note: string;
    payment_method: string;
    referal_code: string;
    code: string;
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="booking-code">
              Kode Booking <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              id="booking-code"
              placeholder="Cth: ODR-001"
              value={form.code}
              onChange={(e) =>
                setForm((p: any) => ({ ...p, code: e.target.value }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
