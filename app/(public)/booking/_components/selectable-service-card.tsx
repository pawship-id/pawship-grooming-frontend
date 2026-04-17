"use client"

import { useState } from "react"
import { Check, Hash, CheckCircle2, Clock, ArrowRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PublicService } from "@/lib/api/stores"

export function SelectableServiceCard({ service, selected, onSelect }: { service: PublicService; selected: boolean; onSelect: () => void }) {
  const [includesOpen, setIncludesOpen] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
          selected ? "border-primary shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
        }`}
      >
        {/* Image — hidden on mobile */}
        {service.image_url && (
          <div className="relative hidden sm:block h-36 w-full overflow-hidden">
            <img
              src={service.image_url}
              alt={service.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow transition-colors ${
              selected ? "border-primary bg-primary" : "border-white/70 bg-black/20"
            }`}>
              {selected && <Check className="h-4 w-4 text-primary-foreground" />}
            </span>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              {service.code && (
                <span className="flex w-fit items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <Hash className="h-2.5 w-2.5" />
                  {service.code}
                </span>
              )}
              <p className={`font-display text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{service.name}</p>
            </div>
            {/* Mobile check indicator (image hidden on mobile) */}
            <span className={`sm:hidden flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              selected ? "border-primary bg-primary" : "border-border"
            }`}>
              {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
            </span>
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{service.description}</p>

          {service.include && service.include.length > 0 && (
            <>
              {/* Desktop: inline list */}
              <ul className="mt-1 hidden sm:flex flex-col gap-1">
                {service.include.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {/* Mobile: button opens modal */}
              <div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIncludesOpen(true) }}
                  className="sm:hidden flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Termasuk ({service.include.length})</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </>
          )}

          <div className="mt-auto flex items-end justify-end pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {service.duration} menit
            </div>
          </div>
        </div>
      </div>

      {/* Includes modal (mobile) */}
      <Dialog open={includesOpen} onOpenChange={setIncludesOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">
              Yang Termasuk dalam {service.name}
            </DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col gap-2.5">
            {service.include?.map((item: string, index: number) => (
              <li key={index} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
