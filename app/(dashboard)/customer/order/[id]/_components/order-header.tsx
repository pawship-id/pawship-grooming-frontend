"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderHeaderProps {
  bookingId: string;
  statusLabel: string;
  statusClassName: string;
  statusIcon: React.ReactNode;
  onBack: () => void;
}

export function OrderHeader({
  bookingId,
  statusLabel,
  statusClassName,
  statusIcon,
  onBack,
}: OrderHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Order Detail
        </h1>
        <p className="text-sm text-muted-foreground">
          #{bookingId.slice(-8).toUpperCase()}
        </p>
      </div>
      <Badge
        variant="outline"
        className={`gap-1.5 text-sm font-medium ${statusClassName}`}
      >
        {statusIcon}
        {statusLabel}
      </Badge>
    </div>
  );
}
