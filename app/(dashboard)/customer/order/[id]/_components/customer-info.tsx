"use client";

import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingCustomer } from "@/lib/api/bookings";

interface CustomerInfoProps {
  customer: BookingCustomer;
}

export function CustomerInfo({ customer }: CustomerInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <p className="text-sm font-medium">{customer.username}</p>
        </div>
        {customer.email && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <p className="text-sm">{customer.email}</p>
          </div>
        )}
        {customer.phone_number && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Phone
            </label>
            <p className="text-sm">{customer.phone_number}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
