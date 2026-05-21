"use client";

import {
  Cake,
  Check,
  ChevronsUpDown,
  Info,
  Loader2,
  Mail,
  Phone,
  Tag,
  Weight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HighlightText, DetailRow } from "@/components/booking/detail-row";
import type { ApiUser, ApiPet } from "@/lib/api/users";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepCustomerPetProps {
  form: { customer_id: string; pet_id: string };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  customers: ApiUser[];
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  customerOpen: boolean;
  setCustomerOpen: (v: boolean) => void;
  loadingCustomers: boolean;
  handleCustomerChange: (customerId: string) => void;
  selectedCustomer: ApiUser | undefined;
  loadingInit: boolean;
  pets: ApiPet[];
  loadingPets: boolean;
  selectedPet: ApiPet | undefined;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepCustomerPet({
  form,
  setForm,
  customers,
  customerSearch,
  setCustomerSearch,
  customerOpen,
  setCustomerOpen,
  loadingCustomers,
  handleCustomerChange,
  selectedCustomer,
  loadingInit,
  pets,
  loadingPets,
  selectedPet,
}: StepCustomerPetProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex flex-col gap-5 pt-6">
        {/* Customer */}
        <div className="flex flex-col gap-2">
          <Label>Customer</Label>
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={customerOpen}
                disabled={loadingInit}
                className="w-full justify-between font-normal"
              >
                {selectedCustomer
                  ? `${selectedCustomer.username} — ${selectedCustomer.phone_number}`
                  : loadingInit
                    ? "Memuat..."
                    : "Cari customer..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Cari nama, telepon, atau email..."
                  value={customerSearch}
                  onValueChange={setCustomerSearch}
                />
                <CommandList>
                  {loadingCustomers && (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mencari...
                    </div>
                  )}
                  {!loadingCustomers && (
                    <CommandEmpty>Customer tidak ditemukan.</CommandEmpty>
                  )}
                  {!loadingCustomers && customers.length > 0 && (
                    <CommandGroup>
                      {customers.map((c) => (
                        <CommandItem
                          key={c._id}
                          value={c._id}
                          onSelect={() => {
                            handleCustomerChange(c._id);
                            setCustomerOpen(false);
                          }}
                          className="flex flex-col items-start gap-0.5"
                        >
                          <div className="flex w-full items-center gap-2">
                            <Check
                              className={`h-4 w-4 shrink-0 ${form.customer_id === c._id ? "opacity-100" : "opacity-0"}`}
                            />
                            <span className="font-medium">
                              <HighlightText
                                text={c.username}
                                query={customerSearch}
                              />
                            </span>
                          </div>
                          <span className="ml-6 text-xs text-muted-foreground">
                            <HighlightText
                              text={c.phone_number}
                              query={customerSearch}
                            />{" "}
                            ·{" "}
                            <HighlightText
                              text={c.email || "-"}
                              query={customerSearch}
                            />
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedCustomer && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
              <DetailRow
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Email"
                value={selectedCustomer.email}
              />
              <DetailRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="No. HP"
                value={selectedCustomer.phone_number}
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant={selectedCustomer.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {selectedCustomer.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Pet */}
        <div className="flex flex-col gap-2">
          <Label>Hewan Peliharaan</Label>
          <Select
            value={form.pet_id}
            onValueChange={(v) => setForm((p: any) => ({ ...p, pet_id: v }))}
            disabled={!form.customer_id || loadingPets}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingPets
                    ? "Memuat..."
                    : !form.customer_id
                      ? "Pilih customer dulu"
                      : pets.length === 0
                        ? "Tidak ada hewan"
                        : "Pilih hewan"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {pets.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPet && (
            <div className="mt-1 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {selectedPet.pet_type?.name && (
                  <DetailRow label="Tipe" value={selectedPet.pet_type.name} />
                )}
                {selectedPet.breed?.name && (
                  <DetailRow label="Ras" value={selectedPet.breed.name} />
                )}
                {selectedPet.size?.name && (
                  <DetailRow label="Ukuran" value={selectedPet.size.name} />
                )}
                {selectedPet.hair?.name && (
                  <DetailRow label="Bulu" value={selectedPet.hair.name} />
                )}
                {selectedPet.weight != null && (
                  <DetailRow
                    icon={<Weight className="h-3.5 w-3.5" />}
                    label="Berat"
                    value={`${selectedPet.weight} kg`}
                  />
                )}
                {selectedPet.birthday && (
                  <DetailRow
                    icon={<Cake className="h-3.5 w-3.5" />}
                    label="Tgl Lahir"
                    value={new Date(selectedPet.birthday).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  />
                )}
              </div>
              {selectedPet.tags && selectedPet.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {selectedPet.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {selectedPet.description && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {selectedPet.description}
                </p>
              )}
              {selectedPet.internal_note && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{selectedPet.internal_note}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
