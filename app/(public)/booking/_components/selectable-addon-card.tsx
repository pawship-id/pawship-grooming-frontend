"use client"

import { useState } from "react"
import { Plus, Minus, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { PublicService } from "@/lib/api/stores"

export function SelectableAddonCard({ service, selected, onToggle }: { service: PublicService; selected: boolean; onToggle: () => void }) {
  const [descOpen, setDescOpen] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className={`group relative flex w-full flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${
          selected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`font-display text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{service.name}</p>
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              selected ? "border-primary bg-primary" : "border-border"
            }`}
          >
            {selected ? <Minus className="h-3 w-3 text-primary-foreground" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
          </span>
        </div>

        {/* Desktop: inline description */}
        <p className="mt-1 hidden sm:block text-xs leading-relaxed text-muted-foreground">{service.description}</p>

        {/* Mobile: button opens description modal */}
        <div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDescOpen(true) }}
            className="sm:hidden mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Info className="h-3 w-3 shrink-0" />
            <span>Lihat deskripsi</span>
          </button>
        </div>
      </div>

      {/* Description modal (mobile) */}
      <Dialog open={descOpen} onOpenChange={setDescOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">{service.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
