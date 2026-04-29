"use client";

import { Package, Home, Store, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AdminBooking } from "@/lib/api/bookings";

interface ServiceInfoProps {
  booking: AdminBooking;
}

export function ServiceInfo({ booking }: ServiceInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Service Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pet Name & Service */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Pet Name
          </label>
          <p className="font-display text-lg font-bold">
            {booking.pet_snapshot.name}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{booking.pet_snapshot.pet_type.name}</span>
            <span>•</span>
            <span>{booking.pet_snapshot.size.name}</span>
            <span>•</span>
            <span>{booking.pet_snapshot.breed.name}</span>
          </div>
        </div>

        <Separator />

        {/* Service */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Service
          </label>
          <p className="font-medium">{booking.service_snapshot.name}</p>
        </div>

        {/* Add-ons */}
        {booking.service_snapshot.addons &&
          booking.service_snapshot.addons.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Add-ons
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {booking.service_snapshot.addons.map((addon) => (
                  <Badge key={addon._id} variant="outline" className="gap-1">
                    + {addon.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        <Separator />

        {/* Type */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Service Type
          </label>
          <Badge
            variant="outline"
            className={`gap-1 text-xs ${
              booking.type === "home_service"
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            {booking.type === "home_service" ? (
              <>
                <Home className="h-3 w-3" /> Home Visit
              </>
            ) : (
              <>
                <Store className="h-3 w-3" /> In-Store
              </>
            )}
          </Badge>
        </div>

        {booking.type === "in store" && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Pickup & Delivery
            </label>
            <div className="flex flex-wrap gap-1.5">
              {booking.pick_up && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                  <Truck className="h-3 w-3" />
                  Pickup
                </span>
              )}
              {booking.delivery && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                  <Truck className="h-3 w-3" />
                  Delivery
                </span>
              )}
              {!booking.pick_up && !booking.delivery && (
                <span className="text-sm text-muted-foreground">Tidak ada</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
