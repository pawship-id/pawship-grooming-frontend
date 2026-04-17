"use client"

import { MapPin, MessageCircle, Check } from "lucide-react"
import type { PublicStore } from "@/lib/api/stores"

export function StoreCard({ store, selected, onSelect }: { store: PublicStore; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
        selected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <span className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? "border-primary bg-primary" : "border-border"
      }`}>
        {selected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
      </span>
      <p className={`font-display text-base font-bold ${selected ? "text-primary" : "text-foreground"}`}>{store.name}</p>
      {store.location?.address && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{store.location.address}{store.location.city ? `, ${store.location.city}` : ""}</span>
        </div>
      )}
      {store.contact?.whatsapp && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>WhatsApp tersedia</span>
        </div>
      )}
    </button>
  )
}
