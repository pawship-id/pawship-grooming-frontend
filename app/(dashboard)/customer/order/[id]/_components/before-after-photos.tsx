"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionMedia } from "@/lib/api/bookings";

interface BeforeAfterPhotosProps {
  media: SessionMedia[];
}

const SECTIONS: { type: "before" | "after" | "other"; label: string }[] = [
  { type: "before", label: "Before" },
  { type: "after", label: "After" },
  { type: "other", label: "Other" },
];

export function BeforeAfterPhotos({ media }: BeforeAfterPhotosProps) {
  const safeMedia = media ?? [];
  const hasOther = safeMedia.some((m) => m.type === "other");
  const sections = hasOther
    ? SECTIONS
    : SECTIONS.filter((s) => s.type !== "other");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          Grooming Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(({ type, label }) => {
          const filtered = safeMedia.filter((m) => m.type === type);
          return (
            <div key={type}>
              <label className="mb-2 block text-xs font-medium capitalize text-muted-foreground">
                {label}
              </label>
              {filtered.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {filtered.map((m, idx) => (
                    <a
                      key={idx}
                      href={m.secure_url || m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-border/50 hover:opacity-90 transition-opacity"
                    >
                      <div className="relative aspect-square w-full">
                        <Image
                          src={m.secure_url || m.url || ""}
                          alt={`${label} grooming ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60">
                  No photos yet
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
