"use client"

import { Check } from "lucide-react"
import type { PublicServiceType } from "@/lib/api/stores"

export function ServiceTypeCard({ serviceType, selected, onSelect }: { serviceType: PublicServiceType; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
        selected ? "border-primary shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Image — hidden on mobile */}
      <div className="relative hidden sm:block h-36 w-full overflow-hidden">
        <img
          src={serviceType.image_url}
          alt={serviceType.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span
          className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow transition-colors ${
            selected ? "border-primary bg-primary" : "border-white/70 bg-black/20"
          }`}
        >
          {selected && <Check className="h-4 w-4 text-primary-foreground" />}
        </span>
        <p className={`absolute bottom-3 left-3 font-display text-base font-bold text-white drop-shadow`}>
          {serviceType.title}
        </p>
      </div>
      {/* Description */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className={`sm:hidden font-display text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>
            {serviceType.title}
          </p>
          {/* Mobile check indicator */}
          <span className={`sm:hidden flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-primary bg-primary" : "border-border"
          }`}>
            {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{serviceType.description}</p>
      </div>
    </button>
  )
}
