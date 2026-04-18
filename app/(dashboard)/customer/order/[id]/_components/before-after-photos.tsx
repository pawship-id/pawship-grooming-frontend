"use client";

import { ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionMedia } from "@/lib/api/bookings";

interface BeforeAfterPhotosProps {
  media: SessionMedia[];
}

export function BeforeAfterPhotos({ media }: BeforeAfterPhotosProps) {
  if (!media || media.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          Before / After Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {(["before", "after"] as const).map((type) => {
            const filtered = media.filter((m) => m.type === type);
            return (
              <div key={type} className="space-y-2">
                <label className="text-xs font-medium capitalize text-muted-foreground">
                  {type === "before" ? "Sebelum" : "Sesudah"}
                </label>
                {filtered.length > 0 ? (
                  <div className="grid gap-2">
                    {filtered.map((m, idx) => (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-lg border border-border/50"
                      >
                        <img
                          src={m.url || m.secure_url}
                          alt={`${type} grooming`}
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
