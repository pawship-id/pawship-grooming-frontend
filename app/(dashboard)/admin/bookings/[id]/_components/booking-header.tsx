"use client";

import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface BookingHeaderProps {
  bookingId: string;
  createdAt: string;
  bookingCode?: string;
}

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function BookingHeader({ bookingId, createdAt, bookingCode }: BookingHeaderProps) {
  const { toast } = useToast();

  const handleCopyCustomerLink = async () => {
    if (!bookingId) {
      toast({
        title: "Gagal menyalin link",
        description: "Booking ID tidak tersedia",
        variant: "destructive",
      });
      return;
    }

    const url = `${getBaseUrl()}/customer/order/${bookingId}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) throw new Error("copy command failed");
      }
      toast({
        title: "Booking link copied",
        description: "Customer booking URL copied to clipboard",
      });
    } catch {
      toast({
        title: "Gagal menyalin link",
        description: "Tidak dapat menyalin booking link ke clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/bookings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Booking #{bookingId.slice(-6).toUpperCase()}
            </h1>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCustomerLink}
                    disabled={!bookingId}
                    aria-label="Copy customer booking link"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy customer booking link</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            Dibuat {formatDateTime(createdAt)}
            {bookingCode && (
              <span className="ml-2 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {bookingCode}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
