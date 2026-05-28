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
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Link
          href="/admin/bookings"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="font-display text-lg font-bold text-foreground sm:text-2xl">
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
          <p className="text-xs text-muted-foreground sm:text-sm">
            Dibuat {formatDateTime(createdAt)}
            {bookingCode && (
              <span className="ml-2 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded sm:text-xs">
                {bookingCode}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
