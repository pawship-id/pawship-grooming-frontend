"use client";

import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserAddress } from "@/lib/api/users";

interface AddressCardProps {
  address: UserAddress | null;
  loading: boolean;
}

export function AddressCard({ address, loading }: AddressCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Alamat
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : !address ? (
          <p className="text-sm text-muted-foreground">
            Alamat pelanggan tidak ditemukan
          </p>
        ) : (
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {address.label || "Alamat"}
              </span>
              {address.is_main_address && (
                <Badge variant="default">Utama</Badge>
              )}
            </div>
            <p className="text-sm text-foreground">
              {[
                address.street,
                address.subdistrict,
                address.district,
                address.city,
                address.province,
                address.postal_code,
              ]
                .filter(Boolean)
                .join(", ") || "-"}
            </p>
            {address.note && (
              <p className="mt-2 text-xs text-muted-foreground">
                Catatan: {address.note}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
