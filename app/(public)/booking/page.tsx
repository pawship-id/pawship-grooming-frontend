"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MapPin, Clock, CheckCircle2, MessageCircle, Check, Plus, Minus, Hash, User, PawPrint, ArrowRight, Info, Loader2, CalendarDays, Truck, Sparkles } from "lucide-react"
import {
  getPublicStores,
  getPublicServices,
  checkUserByPhone,
  getPublicOptions,
  registerPublicUser,
  addPublicPet,
  getPublicBookingPreview,
  publicApplyBenefitPreview,
} from "@/lib/api/stores"
import type {
  PublicStore,
  PublicServiceType,
  PublicService,
  PublicUser,
  PublicUserPet,
  PublicOption,
  PublicPreviewResult,
  PublicApplyBenefitResult,
} from "@/lib/api/stores"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth-context"
import { getCurrentUser } from "@/lib/api/users"
import type { ApiPet } from "@/lib/api/users"

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price)
}

// ── Service Type Card ───────────────────────────────────────────────────────
function ServiceTypeCard({ serviceType, selected, onSelect }: { serviceType: PublicServiceType; selected: boolean; onSelect: () => void }) {
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

// ── Store Card ──────────────────────────────────────────────────────────────
function StoreCard({ store, selected, onSelect }: { store: PublicStore; selected: boolean; onSelect: () => void }) {
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

// ── Selectable Service Card ─────────────────────────────────────────────────
function SelectableServiceCard({ service, selected, onSelect }: { service: PublicService; selected: boolean; onSelect: () => void }) {
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

// ── Selectable Add-on Card ──────────────────────────────────────────────────
function SelectableAddonCard({ service, selected, onToggle }: { service: PublicService; selected: boolean; onToggle: () => void }) {
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

        <div className="mt-3 flex items-end justify-end">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {service.duration} menit
          </div>
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

// ── Step Header ─────────────────────────────────────────────────────────────
function StepHeader({ step, title, done }: { step: number; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : step}
      </span>
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
    </div>
  )
}

// ── Main Booking Content ─────────────────────────────────────────────────────
function BookingContent() {
  const searchParams = useSearchParams()
  const serviceIdFromQuery = searchParams.get("serviceId")
  const storeIdFromQuery = searchParams.get("storeId")
  const serviceTypeIdFromQuery = searchParams.get("serviceTypeId")
  const { user: authUser, isAuthenticated } = useAuth()

  // Auto-fetch logged-in user data
  const [authDataLoaded, setAuthDataLoaded] = useState(false)

  // Stores from API
  const [stores, setStores] = useState<PublicStore[]>([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [storesError, setStoresError] = useState("")

  useEffect(() => {
    getPublicStores()
      .then((res) => {
        const activeStores = res.stores
          .filter((s) => s.is_active)
          .sort((a, b) => {
            if (a.is_default_store && !b.is_default_store) return -1
            if (!a.is_default_store && b.is_default_store) return 1
            return 0
          })
        setStores(activeStores)

        // Auto-select store and service type from query params
        if (storeIdFromQuery) {
          const store = activeStores.find((s) => s._id === storeIdFromQuery)
          if (store) {
            setSelectedStoreId(store._id)
            if (serviceTypeIdFromQuery) {
              const hasType = store.serviceTypes.some((st) => st._id === serviceTypeIdFromQuery)
              if (hasType) {
                setSelectedServiceTypeId(serviceTypeIdFromQuery)
              }
            }
          }
        }
      })
      .catch(() => setStoresError("Gagal memuat daftar store. Silakan coba lagi."))
      .finally(() => setStoresLoading(false))
  }, [])

  // Step 1–2 state
  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState("")

  // Step 3: Services from API
  const [services, setServices] = useState<PublicService[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesError, setServicesError] = useState("")

  // Step 4: Add-on services from API
  const [addOnServices, setAddOnServices] = useState<PublicService[]>([])
  const [addOnsLoading, setAddOnsLoading] = useState(false)

  // Step 3 & 4 state
  const [selectedServiceId, setSelectedServiceId] = useState(serviceIdFromQuery ?? "")
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [showAddons, setShowAddons] = useState(false)

  // Date & session slot state
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTimeRange, setSelectedTimeRange] = useState("")

  // Fetch services when store + service type are selected
  useEffect(() => {
    if (!selectedStoreId || !selectedServiceTypeId) {
      setServices([])
      return
    }
    setServicesLoading(true)
    setServicesError("")
    setSelectedServiceId("")
    setSelectedAddonIds([])
    setShowAddons(false)
    getPublicServices(selectedStoreId, selectedServiceTypeId)
      .then((res) => {
        const active = res.services.filter((s) => s.is_active)
        setServices(active)
        // Auto-select service from query param if available
        if (serviceIdFromQuery && active.some((s) => s._id === serviceIdFromQuery)) {
          setSelectedServiceId(serviceIdFromQuery)
        }
      })
      .catch(() => setServicesError("Gagal memuat layanan. Silakan coba lagi."))
      .finally(() => setServicesLoading(false))
  }, [selectedStoreId, selectedServiceTypeId])

  // Fetch add-on services when store is selected and current type is NOT "Addons"
  useEffect(() => {
    if (!selectedStoreId) { setAddOnServices([]); return }
    const currentStore = stores.find((s) => s._id === selectedStoreId)
    if (!currentStore) { setAddOnServices([]); return }
    const isAddonsType = currentStore.serviceTypes
      .find((t) => t._id === selectedServiceTypeId)?.title.toLowerCase() === "addons"
    if (isAddonsType) { setAddOnServices([]); return }
    const addonsTypeId = currentStore.serviceTypes
      .find((t) => t.title.toLowerCase() === "addons")?._id
    if (!addonsTypeId) { setAddOnServices([]); return }
    setAddOnsLoading(true)
    getPublicServices(selectedStoreId, addonsTypeId)
      .then((res) => setAddOnServices(res.services.filter((s) => s.is_active)))
      .catch(() => setAddOnServices([]))
      .finally(() => setAddOnsLoading(false))
  }, [selectedStoreId, selectedServiceTypeId, stores])

  // Options from API (pet types, breeds, sizes)
  const [petTypes, setPetTypes] = useState<PublicOption[]>([])
  const [breedCategories, setBreedCategories] = useState<PublicOption[]>([])
  const [sizeCategories, setSizeCategories] = useState<PublicOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  useEffect(() => {
    setOptionsLoading(true)
    Promise.all([
      getPublicOptions("pet type"),
      getPublicOptions("breed category"),
      getPublicOptions("size category"),
    ])
      .then(([typesRes, breedsRes, sizesRes]) => {
        setPetTypes(typesRes.options.filter((o) => o.is_active))
        setBreedCategories(breedsRes.options.filter((o) => o.is_active))
        setSizeCategories(sizesRes.options.filter((o) => o.is_active))
      })
      .catch(() => {})
      .finally(() => setOptionsLoading(false))
  }, [])

  // Auto-fill user info for logged-in users
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthDataLoaded(false)
      return
    }
    getCurrentUser()
      .then((res) => {
        const u = res.user
        setUserName(u.username)
        setEmail(u.email)
        setPhone(u.phone_number ?? "")
        setPhoneChecked(true)
        setExistingUser({ _id: u._id, username: u.username, email: u.email })
        // Map ApiPet[] to PublicUserPet[]
        const pets: PublicUserPet[] = (u.pets ?? [])
          .filter((p) => p.is_active && !p.isDeleted)
          .map((p) => ({
            _id: p._id,
            name: p.name,
            pet_type: p.pet_type ?? { _id: "", name: "" },
            breed: p.breed ?? { _id: "", name: "" },
            size: p.size ?? { _id: "", name: "" },
          }))
        setExistingPets(pets)
        setPetMode(pets.length > 0 ? "select" : "create")
        setSelectedPetId(pets[0]?._id ?? "")
      })
      .catch(() => {})
      .finally(() => setAuthDataLoaded(true))
  }, [isAuthenticated])

  // User & pet info state
  const [phone, setPhone] = useState("")
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [phoneChecked, setPhoneChecked] = useState(false)
  const [existingUser, setExistingUser] = useState<PublicUser | null>(null)
  const [existingPets, setExistingPets] = useState<PublicUserPet[]>([])
  const [userName, setUserName] = useState("")
  const [email, setEmail] = useState("")
  const [petMode, setPetMode] = useState<"select" | "create">("select")
  const [selectedPetId, setSelectedPetId] = useState("")
  const [newPetName, setNewPetName] = useState("")
  const [newPetTypeId, setNewPetTypeId] = useState("")
  const [newBreedId, setNewBreedId] = useState("")
  const [newSizeId, setNewSizeId] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [formError, setFormError] = useState("")
  const [submittingUserInfo, setSubmittingUserInfo] = useState(false)
  const [userInfoConfirmed, setUserInfoConfirmed] = useState(false)
  const [confirmedPetId, setConfirmedPetId] = useState("")

  // Pick-up state
  const [isPickup, setIsPickup] = useState(false)

  // Pricing preview state
  const [previewData, setPreviewData] = useState<PublicPreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Benefit state
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<string[]>([])
  const [applyBenefitResult, setApplyBenefitResult] = useState<PublicApplyBenefitResult | null>(null)
  const [applyBenefitLoading, setApplyBenefitLoading] = useState(false)

  // Step 5 state
  const [bookingCreated, setBookingCreated] = useState(false)

  const selectedStore = stores.find((s) => s._id === selectedStoreId)
  const selectedServiceType = selectedStore?.serviceTypes.find((t) => t._id === selectedServiceTypeId)
  const selectedService = services.find((s) => s._id === selectedServiceId)
  const selectedAddons = addOnServices.filter((a) => selectedAddonIds.includes(a._id))
  const availablePets = existingPets

  // Dynamic step numbers — add-ons step is skipped when no add-on services exist
  const hasAddons = addOnServices.length > 0
  const stepAddOns = 4
  const stepSchedule = hasAddons ? 5 : 4
  const stepUserInfo = hasAddons ? 6 : 5
  const stepSummary = hasAddons ? 7 : 6

  // Derived pet label for summary
  const petLabel = existingUser
    ? petMode === "select"
      ? existingPets.find((p) => p._id === selectedPetId)?.name ?? ""
      : newPetName
    : newPetName

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setUserInfoConfirmed(false)
    setBookingCreated(false)
  }

  function resetServiceType() {
    setSelectedServiceTypeId("")
    setSelectedServiceId("")
    setServices([])
    setAddOnServices([])
    setSelectedAddonIds([])
    setShowAddons(false)
    setSelectedDate("")
    setSelectedTimeRange("")
    resetUserInfo()
  }

  function resetUserInfo() {
    if (!isAuthenticated) {
      setPhone("")
      setPhoneChecked(false)
      setExistingUser(null)
      setExistingPets([])
      setUserName("")
      setEmail("")
    }
    setPetMode(isAuthenticated && existingPets.length > 0 ? "select" : "create")
    setSelectedPetId(isAuthenticated ? existingPets[0]?._id ?? "" : "")
    setNewPetName("")
    setNewPetTypeId("")
    setNewBreedId("")
    setNewSizeId("")
    setPhoneError("")
    setFormError("")
    setSubmittingUserInfo(false)
    setUserInfoConfirmed(false)
    setConfirmedPetId("")
    setIsPickup(false)
    setPreviewData(null)
    setPreviewLoading(false)
    setSelectedBenefitIds([])
    setApplyBenefitResult(null)
    setApplyBenefitLoading(false)
    setBookingCreated(false)
  }

  // ── Preview: auto-fetch pricing when user info is confirmed ──
  useEffect(() => {
    if (!userInfoConfirmed || !selectedServiceId || !selectedDate || !confirmedPetId) {
      setPreviewData(null)
      setSelectedBenefitIds([])
      setApplyBenefitResult(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewData(null)
    setSelectedBenefitIds([])
    setApplyBenefitResult(null)
    getPublicBookingPreview({
      pet_id: confirmedPetId,
      service_id: selectedServiceId,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      date: selectedDate,
      time_range: selectedTimeRange || undefined,
    })
      .then((res) => { if (!cancelled) setPreviewData(res) })
      .catch(() => { if (!cancelled) setPreviewData(null) })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [userInfoConfirmed, confirmedPetId, selectedServiceId, selectedAddonIds, selectedDate, selectedTimeRange])

  // ── Apply benefit: auto-fetch when benefit selection changes ──
  useEffect(() => {
    if (!confirmedPetId || !selectedServiceId) return
    if (selectedBenefitIds.length === 0) {
      setApplyBenefitResult(null)
      setApplyBenefitLoading(false)
      return
    }
    let cancelled = false
    setApplyBenefitLoading(true)
    publicApplyBenefitPreview({
      pet_id: confirmedPetId,
      selected_benefit_ids: selectedBenefitIds,
      service_id: selectedServiceId,
      add_on_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      store_id: selectedStoreId || undefined,
      original_total_price: previewData?.pricing_breakdown?.grand_total,
      booking_date: selectedDate || undefined,
    })
      .then((res) => { if (!cancelled) setApplyBenefitResult(res) })
      .catch(() => { if (!cancelled) setApplyBenefitResult(null) })
      .finally(() => { if (!cancelled) setApplyBenefitLoading(false) })
    return () => { cancelled = true }
  }, [selectedBenefitIds, confirmedPetId, selectedServiceId, selectedAddonIds])

  // Benefit toggle with conflict detection
  function toggleBenefit(id: string) {
    if (!previewData) {
      setSelectedBenefitIds((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id])
      return
    }
    const benefit = previewData.pricing.available_benefits.find((x) => x._id === id)
    if (!benefit) {
      setSelectedBenefitIds((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id])
      return
    }
    setSelectedBenefitIds((prev) => {
      if (prev.includes(id)) return prev.filter((b) => b !== id)
      // auto-remove conflicting benefits on the same target
      const conflicts = prev.filter((selId) => {
        const sel = previewData.pricing.available_benefits.find((x) => x._id === selId)
        if (!sel || sel.applies_to !== benefit.applies_to) return false
        if (benefit.type === sel.type) return false
        if (benefit.applies_to === "service") {
          const quotaTarget = (benefit.type === "quota" ? benefit : sel).service_id || selectedServiceId
          const discountTarget = (benefit.type === "discount" ? benefit : sel).service_id || selectedServiceId
          return quotaTarget === discountTarget
        }
        if (benefit.applies_to === "addon") {
          const quotaBenefit = benefit.type === "quota" ? benefit : sel
          const discountBenefit = benefit.type === "discount" ? benefit : sel
          if (quotaBenefit.service_id && discountBenefit.service_id) return quotaBenefit.service_id === discountBenefit.service_id
          if (quotaBenefit.service_id && !discountBenefit.service_id) {
            const coveredByOtherQuotas = prev
              .filter((sid) => sid !== id)
              .map((sid) => previewData.pricing.available_benefits.find((x) => x._id === sid))
              .filter((x): x is NonNullable<typeof x> => !!x && x.type === "quota" && x.applies_to === "addon" && !!x.service_id)
              .map((x) => x.service_id)
            const coveredAfter = new Set([...coveredByOtherQuotas, quotaBenefit.service_id])
            return selectedAddonIds.length > 0 && selectedAddonIds.every((aid) => coveredAfter.has(aid))
          }
          if (!quotaBenefit.service_id && discountBenefit.service_id) return true
          return true
        }
        return false
      })
      return [...prev.filter((b) => !conflicts.includes(b)), id]
    })
  }

  async function handleCheckPhone() {
    const normalized = phone.replace(/\D/g, "")
    if (!normalized) {
      setPhoneError("Nomor HP wajib diisi.")
      return
    }
    setCheckingPhone(true)
    setPhoneError("")
    try {
      const res = await checkUserByPhone(normalized)
      setPhoneChecked(true)
      setUserInfoConfirmed(false)
      setBookingCreated(false)
      if (res.exists && res.user) {
        setExistingUser(res.user)
        setExistingPets(res.pets)
        setPetMode(res.pets.length > 0 ? "select" : "create")
        setSelectedPetId(res.pets[0]?._id ?? "")
        setUserName(res.user.username)
        setEmail(res.user.email)
      } else {
        setExistingUser(null)
        setExistingPets([])
        setPetMode("select")
        setSelectedPetId("")
        setUserName("")
        setEmail("")
        setNewPetName("")
        setNewPetTypeId("")
        setNewBreedId("")
        setNewSizeId("")
      }
    } catch {
      setPhoneError("Gagal memeriksa nomor HP. Silakan coba lagi.")
    } finally {
      setCheckingPhone(false)
    }
  }

  async function handleConfirmUserInfo() {
    if (!isAuthenticated && !phoneChecked) { setFormError("Silakan cek nomor HP terlebih dahulu."); return }
    if (!existingUser && (!userName.trim() || !email.trim())) { setFormError("Nama dan email wajib diisi."); return }
    if (!existingUser && !newPetName.trim()) { setFormError("Nama pet wajib diisi."); return }
    if (!existingUser && !newPetTypeId) { setFormError("Tipe pet wajib dipilih."); return }
    if (!existingUser && !newBreedId) { setFormError("Breed pet wajib dipilih."); return }
    if (!existingUser && !newSizeId) { setFormError("Ukuran pet wajib dipilih."); return }
    if (existingUser && petMode === "select" && !selectedPetId) { setFormError("Silakan pilih pet."); return }
    if (existingUser && petMode === "create" && !newPetName.trim()) { setFormError("Nama pet baru wajib diisi."); return }
    if (existingUser && petMode === "create" && !newPetTypeId) { setFormError("Tipe pet baru wajib dipilih."); return }
    if (existingUser && petMode === "create" && !newBreedId) { setFormError("Breed pet baru wajib dipilih."); return }
    if (existingUser && petMode === "create" && !newSizeId) { setFormError("Ukuran pet baru wajib dipilih."); return }
    setFormError("")
    setSubmittingUserInfo(true)
    try {
      let resolvedPetId = selectedPetId
      if (isAuthenticated && existingUser) {
        // Authenticated users: no registration needed
        resolvedPetId = petMode === "select" ? selectedPetId : ""
      } else {
        const normalizedPhone = phone.replace(/\D/g, "")
        if (!existingUser) {
          const res = await registerPublicUser({
            username: userName.trim(),
            email: email.trim(),
            phone_number: normalizedPhone,
            pet: {
              name: newPetName.trim(),
              pet_type_id: newPetTypeId,
              breed_category_id: newBreedId,
              size_category_id: newSizeId,
            },
          }) as any
          if (res?.pet?._id) resolvedPetId = res.pet._id
        } else if (petMode === "create") {
          const res = await addPublicPet({
            phone_number: normalizedPhone,
            pet_name: newPetName.trim(),
            pet_type_id: newPetTypeId,
            breed_category_id: newBreedId,
            size_category_id: newSizeId,
          }) as any
          if (res?.pet?._id) resolvedPetId = res.pet._id
        }
      }
      setConfirmedPetId(resolvedPetId)
      setUserInfoConfirmed(true)
    } catch {
      setFormError("Gagal menyimpan data. Silakan coba lagi.")
    } finally {
      setSubmittingUserInfo(false)
    }
  }

  return (
    <main className="flex-1 bg-muted/20 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Book a Service</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pilih store, jenis layanan, layanan, lalu isi informasi kamu.</p>
        </div>

        {/* ── Step 1: Store ── */}
        <section className="flex flex-col gap-4">
          <StepHeader step={1} title="Pilih Store" done={!!selectedStore} />

          {storesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat store...
            </div>
          ) : storesError ? (
            <p className="text-sm text-destructive">{storesError}</p>
          ) : (
            <>
              {/* Mobile: dropdown */}
              <div className="sm:hidden">
                <Select
                  value={selectedStoreId}
                  onValueChange={(id) => {
                    setSelectedStoreId(id)
                    resetServiceType()
                  }}
                >
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Pilih store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>
                        <div className="flex flex-col text-left">
                          <span className="font-semibold">{store.name}</span>
                          {store.location?.city && (
                            <span className="text-xs text-muted-foreground">{store.location.city}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStore?.contact?.whatsapp && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="text-emerald-600">WhatsApp tersedia</span>
                  </div>
                )}
              </div>

              {/* Desktop: card grid */}
              <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stores.map((store) => (
                  <StoreCard
                    key={store._id}
                    store={store}
                    selected={selectedStoreId === store._id}
                    onSelect={() => {
                      setSelectedStoreId(store._id)
                      resetServiceType()
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Step 2: Service Type ── */}
        {selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={2} title="Pilih Jenis Layanan" done={!!selectedServiceType} />
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedStore.serviceTypes.map((type) => (
                <ServiceTypeCard
                  key={type._id}
                  serviceType={type}
                  selected={selectedServiceTypeId === type._id}
                  onSelect={() => {
                    setSelectedServiceTypeId(type._id)
                    setSelectedServiceId("")
                    setSelectedAddonIds([])
                    setShowAddons(false)
                    resetUserInfo()
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Step 3: Service ── */}
        {selectedServiceType && (
          <section className="flex flex-col gap-4">
            <StepHeader step={3} title="Pilih Layanan" done={!!selectedService} />

            {servicesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat layanan...
              </div>
            ) : servicesError ? (
              <p className="text-sm text-destructive">{servicesError}</p>
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada layanan tersedia untuk jenis ini.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((svc) => (
                  <SelectableServiceCard
                    key={svc._id}
                    service={svc}
                    selected={selectedServiceId === svc._id}
                    onSelect={() => {
                      setSelectedServiceId(svc._id)
                      setSelectedAddonIds([])
                      setShowAddons(false)
                      resetUserInfo()
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Step 4: Add-ons ── */}
        {selectedService && selectedServiceType?.title.toLowerCase() !== "addons" && addOnServices.length > 0 && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepAddOns} title="Tambah Add-On (opsional)" done={selectedAddonIds.length > 0} />

            {/* Toggle button */}
            <button
              type="button"
              onClick={() => {
                const next = !showAddons
                setShowAddons(next)
                if (!next) {
                  setSelectedAddonIds([])
                  setUserInfoConfirmed(false)
                  setBookingCreated(false)
                }
              }}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                showAddons ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                showAddons ? "border-primary bg-primary" : "border-border"
              }`}>
                {showAddons ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${showAddons ? "text-primary" : "text-foreground"}`}>
                  Ingin menambahkan add-on?
                </p>
                <p className="text-xs text-muted-foreground">Layanan tambahan seperti spa, perawatan ekstra, dll.</p>
              </div>
            </button>

            {showAddons && (
              addOnsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat add-on...
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {addOnServices.map((addon) => (
                    <SelectableAddonCard
                      key={addon._id}
                      service={addon}
                      selected={selectedAddonIds.includes(addon._id)}
                      onToggle={() => toggleAddon(addon._id)}
                    />
                  ))}
                </div>
              )
            )}
          </section>
        )}

        {/* ── Schedule Step: Pilih Jadwal ── */}
        {selectedService && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepSchedule} title="Pilih Jadwal" done={!!selectedDate && !!selectedTimeRange} />
            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="booking-date">Tanggal</Label>
                    <Input
                      id="booking-date"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value)
                        setUserInfoConfirmed(false)
                        setBookingCreated(false)
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Sesi</Label>
                    <Select
                      value={selectedTimeRange}
                      onValueChange={(v) => {
                        setSelectedTimeRange(v)
                        setUserInfoConfirmed(false)
                        setBookingCreated(false)
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih sesi" /></SelectTrigger>
                      <SelectContent>
                        {(selectedStore?.sessions ?? []).map((session) => (
                          <SelectItem key={session} value={session}>{session}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!selectedStore?.sessions || selectedStore.sessions.length === 0) && (
                      <p className="text-xs text-muted-foreground">Tidak ada sesi tersedia untuk store ini.</p>
                    )}
                  </div>
                </div>

                {/* Pick-up toggle */}
                {selectedService?.is_pick_up_available && selectedStore?.is_pick_up_available && (
                  <>
                    <Separator />
                    <label
                      htmlFor="pickup"
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                        isPickup ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        id="pickup"
                        checked={isPickup}
                        onCheckedChange={(checked) => {
                          setIsPickup(!!checked)
                          setUserInfoConfirmed(false)
                          setBookingCreated(false)
                        }}
                        className="shrink-0"
                      />
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Aktifkan Pickup (Jemput / Antar)</span>
                      </div>
                    </label>
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Step 5: User & Pet Info ── */}
        {selectedService && selectedDate && selectedTimeRange && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepUserInfo} title="Informasi Kamu & Anabul" done={userInfoConfirmed} />
            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-5 p-6">

                {/* Logged-in user greeting */}
                {isAuthenticated && authDataLoaded && existingUser && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-3">
                    <User className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm text-foreground">
                      Halo, <span className="font-semibold">{existingUser.username}</span>! Data kamu sudah terisi otomatis.
                    </p>
                  </div>
                )}

                {/* Logged-in user loading */}
                {isAuthenticated && !authDataLoaded && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat data pengguna...
                  </div>
                )}

                {/* Phone check — only for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">Nomor HP</Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        placeholder="08xxxxxxxxxx"
                        value={phone}
                        disabled={userInfoConfirmed}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          setPhoneChecked(false)
                          setExistingUser(null)
                          setExistingPets([])
                          setUserInfoConfirmed(false)
                          setBookingCreated(false)
                        }}
                      />
                      <Button type="button" variant="outline" disabled={userInfoConfirmed || checkingPhone} onClick={handleCheckPhone}>
                        {checkingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cek"}
                      </Button>
                    </div>
                    {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                  </div>
                )}

                {/* Existing customer */}
                {((phoneChecked && existingUser) || (isAuthenticated && authDataLoaded && existingUser)) && (
                  <>
                    {!isAuthenticated && (
                      <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-4 py-3">
                        <User className="h-4 w-4 shrink-0 text-primary" />
                        <p className="text-sm text-foreground">
                          Halo, <span className="font-semibold">{existingUser.username}</span>! Nomor kamu sudah terdaftar.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <PawPrint className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Pilih Anabul</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={petMode === "select" ? "default" : "outline"}
                          disabled={userInfoConfirmed}
                          onClick={() => setPetMode("select")}
                        >
                          Pilih yang ada
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={petMode === "create" ? "default" : "outline"}
                          disabled={userInfoConfirmed}
                          onClick={() => setPetMode("create")}
                        >
                          Tambah baru
                        </Button>
                      </div>

                      {petMode === "select" && (
                        <div className="flex flex-col gap-1.5">
                          <Label>Anabul</Label>
                          <Select value={selectedPetId} disabled={userInfoConfirmed} onValueChange={setSelectedPetId}>
                            <SelectTrigger><SelectValue placeholder="Pilih anabul" /></SelectTrigger>
                            <SelectContent>
                              {availablePets.map((pet) => (
                                <SelectItem key={pet._id} value={pet._id}>
                                  {pet.name} ({pet.pet_type.name}, {pet.size.name})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {availablePets.length === 0 && (
                            <p className="text-xs text-muted-foreground">Tidak ada anabul yang cocok. Silakan tambah baru.</p>
                          )}
                        </div>
                      )}

                      {petMode === "create" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label>Nama Anabul</Label>
                            <Input placeholder="Contoh: Mochi" value={newPetName} disabled={userInfoConfirmed} onChange={(e) => setNewPetName(e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label>Tipe</Label>
                            <Select value={newPetTypeId} disabled={userInfoConfirmed || optionsLoading} onValueChange={(v) => { setNewPetTypeId(v); setNewBreedId("") }}>
                              <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                              <SelectContent>
                                {petTypes.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label>Breed</Label>
                            <Select value={newBreedId} disabled={userInfoConfirmed || optionsLoading} onValueChange={setNewBreedId}>
                              <SelectTrigger><SelectValue placeholder="Pilih breed" /></SelectTrigger>
                              <SelectContent>
                                {breedCategories.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label>Ukuran</Label>
                            <Select value={newSizeId} disabled={userInfoConfirmed || optionsLoading} onValueChange={setNewSizeId}>
                              <SelectTrigger><SelectValue placeholder="Pilih ukuran" /></SelectTrigger>
                              <SelectContent>
                                {sizeCategories.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* New customer */}
                {phoneChecked && !existingUser && (
                  <>
                    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Nomor belum terdaftar. Lengkapi data berikut.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label>Nama Lengkap</Label>
                        <Input placeholder="Nama kamu" value={userName} disabled={userInfoConfirmed} onChange={(e) => setUserName(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label>Email</Label>
                        <Input type="email" placeholder="email@domain.com" value={email} disabled={userInfoConfirmed} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Data Anabul</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label>Nama Anabul</Label>
                        <Input placeholder="Contoh: Mochi" value={newPetName} disabled={userInfoConfirmed} onChange={(e) => setNewPetName(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Tipe</Label>
                        <Select value={newPetTypeId} disabled={userInfoConfirmed || optionsLoading} onValueChange={(v) => { setNewPetTypeId(v); setNewBreedId("") }}>
                          <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                          <SelectContent>
                            {petTypes.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Breed</Label>
                        <Select value={newBreedId} disabled={userInfoConfirmed || optionsLoading} onValueChange={setNewBreedId}>
                          <SelectTrigger><SelectValue placeholder="Pilih breed" /></SelectTrigger>
                          <SelectContent>
                            {breedCategories.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ukuran</Label>
                        <Select value={newSizeId} disabled={userInfoConfirmed || optionsLoading} onValueChange={setNewSizeId}>
                          <SelectTrigger><SelectValue placeholder="Pilih ukuran" /></SelectTrigger>
                          <SelectContent>
                            {sizeCategories.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                {!userInfoConfirmed ? (
                  <Button className="w-full font-display font-bold" onClick={handleConfirmUserInfo} disabled={(!isAuthenticated && !phoneChecked) || submittingUserInfo}>
                    {submittingUserInfo ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : "Konfirmasi Informasi"}
                  </Button>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm font-medium text-primary">
                        {existingUser ? existingUser.username : userName} · {petLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetUserInfo}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Ubah
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Step 6: Summary & Confirm ── */}
        {userInfoConfirmed && selectedService && selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepSummary} title="Ringkasan Booking" done={bookingCreated} />
            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-4 p-6">
                {/* Store */}
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Store</p>
                    <p className="text-sm font-semibold text-foreground">{selectedStore.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedStore.location?.address, selectedStore.location?.city].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* User & Pet */}
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pemilik</p>
                    <p className="text-sm font-semibold text-foreground">{existingUser ? existingUser.username : userName}</p>
                    <p className="text-xs text-muted-foreground">{phone}</p>
                  </div>
                  <div className="ml-auto flex items-start gap-3 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Anabul</p>
                      <p className="text-sm font-semibold text-foreground">{petLabel}</p>
                    </div>
                    <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  </div>
                </div>

                <Separator />

                {/* Service */}
                <div>
                  <p className="text-xs text-muted-foreground">Jenis Layanan</p>
                  <p className="text-xs font-medium text-primary">{selectedServiceType?.title}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selectedService.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {selectedService.duration} menit
                  </div>
                </div>

                {/* Schedule */}
                {selectedDate && selectedTimeRange && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Jadwal</p>
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedTimeRange}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Add-ons */}
                {selectedAddons.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Add-On ({selectedAddons.length})</p>
                      {selectedAddons.map((addon) => (
                        <div key={addon._id} className="flex items-center gap-1.5">
                          <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30 text-[10px]">
                            add-on
                          </Badge>
                          <span className="text-sm text-foreground">{addon.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Pick-up indicator */}
                {isPickup && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Pick-up ke lokasi</span>
                    </div>
                  </>
                )}

                {/* ── Pricing Breakdown ── */}
                {previewLoading && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menghitung harga...
                    </div>
                  </>
                )}

                {previewData && (
                  <>
                    <Separator />
                    <div className="flex flex-col overflow-hidden rounded-lg border border-border/60">
                      <div className="bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Rincian Harga
                      </div>

                      {/* Service price row */}
                      {(() => {
                        const b = previewData.pricing.available_benefits.find(
                          (x) => selectedBenefitIds.includes(x._id) && x.applies_to === "service" && (!x.service_id || x.service_id === selectedServiceId) && (x.type === "discount" || x.type === "quota") && x.can_apply
                        )
                        const isQuota = b?.type === "quota"
                        return (
                          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{previewData.pricing_breakdown.service.name}</span>
                              {b && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                  isQuota
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                    : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                }`}>
                                  {isQuota ? "Gratis" : (b.value != null ? `-${b.value}%` : "Diskon")}
                                </span>
                              )}
                            </div>
                            {b ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-xs line-through text-muted-foreground">{formatPrice(previewData.pricing_breakdown.service.price)}</span>
                                <span className="font-semibold text-primary">
                                  {isQuota ? "Gratis" : formatPrice(Math.max(0, previewData.pricing_breakdown.service.price - (b.amount_discount ?? 0)))}
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium">{formatPrice(previewData.pricing_breakdown.service.price)}</span>
                            )}
                          </div>
                        )
                      })()}

                      {/* Addon price rows */}
                      {previewData.pricing_breakdown.addons.map((addon) => {
                        const b = previewData.pricing.available_benefits.find(
                          (x) => selectedBenefitIds.includes(x._id) && x.applies_to === "addon" && (!x.service_id || x.service_id === addon._id) && (x.type === "discount" || x.type === "quota") && x.can_apply
                        )
                        const isQuota = b?.type === "quota"
                        const addonDiscountAmount = !b ? 0 : (b.service_id ? (b.amount_discount ?? 0) : (isQuota ? addon.price : addon.price * (b.value ?? 0) / 100))
                        return (
                          <div key={addon._id} className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{addon.name}</span>
                              {b && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                  isQuota
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                    : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                }`}>
                                  {isQuota ? "Gratis" : (b.value != null ? `-${b.value}%` : "Diskon")}
                                </span>
                              )}
                            </div>
                            {b ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-xs line-through text-muted-foreground">{formatPrice(addon.price)}</span>
                                <span className="font-semibold text-primary">
                                  {isQuota ? "Gratis" : formatPrice(Math.max(0, addon.price - addonDiscountAmount))}
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium">{formatPrice(addon.price)}</span>
                            )}
                          </div>
                        )
                      })}

                      {/* Subtotal */}
                      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                        <span>Subtotal</span>
                        <span>{formatPrice(previewData.pricing_breakdown.grand_total)}</span>
                      </div>

                      {/* Diskon Member */}
                      {selectedBenefitIds.length > 0 && (applyBenefitLoading || (applyBenefitResult && applyBenefitResult.total_discount > 0)) && (
                        <div className="flex items-center justify-between border-t border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
                          <span className="flex items-center gap-1.5 font-medium text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                            Diskon Member
                          </span>
                          {applyBenefitLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <span className="font-semibold text-primary">- {formatPrice(applyBenefitResult!.total_discount)}</span>
                          )}
                        </div>
                      )}

                      {/* Total Akhir */}
                      {(() => {
                        const grandTotal = previewData.pricing_breakdown.grand_total
                        const hasDiscount = selectedBenefitIds.length > 0 && applyBenefitResult != null && applyBenefitResult.total_discount > 0
                        const displayTotal = hasDiscount ? applyBenefitResult!.final_price : grandTotal
                        return (
                          <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                            <span>Total Akhir</span>
                            <span className="text-base">{formatPrice(Math.max(0, displayTotal))}</span>
                          </div>
                        )
                      })()}
                    </div>
                  </>
                )}

                {/* ── Benefit Membership Selection ── */}
                {previewData && previewData.pricing.has_active_membership && previewData.pricing.available_benefits.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Benefit Membership</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {previewData.pricing.available_benefits.filter((b) => b.can_apply).length} tersedia
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {previewData.pricing.available_benefits.map((benefit) => {
                          const selected = selectedBenefitIds.includes(benefit._id)
                          const canApply = benefit.can_apply
                          const blockedByQuota = canApply && benefit.type === "discount" && (() => {
                            const available = previewData.pricing.available_benefits
                            if (benefit.applies_to === "service") {
                              const discountTarget = benefit.service_id || selectedServiceId
                              return available.some(
                                (x) => selectedBenefitIds.includes(x._id) && x.type === "quota" && x.applies_to === "service" && (x.service_id === discountTarget || !x.service_id)
                              )
                            }
                            if (benefit.applies_to === "addon") {
                              const selectedQuotas = available.filter(
                                (x) => selectedBenefitIds.includes(x._id) && x.type === "quota" && x.applies_to === "addon"
                              )
                              if (benefit.service_id) {
                                return selectedQuotas.some((x) => !x.service_id || x.service_id === benefit.service_id)
                              } else {
                                if (selectedAddonIds.length === 0) return false
                                const hasAllCoverQuota = selectedQuotas.some((x) => !x.service_id)
                                if (hasAllCoverQuota) return true
                                const coveredIds = new Set(selectedQuotas.filter((x) => x.service_id).map((x) => x.service_id))
                                return selectedAddonIds.every((id) => coveredIds.has(id))
                              }
                            }
                            return false
                          })()
                          const isDisabled = !canApply || blockedByQuota
                          return (
                            <label
                              key={benefit._id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                isDisabled
                                  ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                                  : selected
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-card hover:border-primary/40"
                              }`}
                            >
                              <Checkbox
                                checked={selected}
                                disabled={isDisabled}
                                onCheckedChange={() => !isDisabled && toggleBenefit(benefit._id)}
                                className="mt-0.5"
                              />
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-foreground">{benefit.label || benefit.description}</span>
                                <span className="text-xs text-muted-foreground">
                                  {benefit.type === "discount" ? `${benefit.value}% off` : "Kuota gratis"}
                                  {benefit.applies_to === "service" ? " · Layanan" : benefit.applies_to === "addon" ? " · Add-on" : " · Pick-up"}
                                  {benefit.service?.name ? ` (${benefit.service.name})` : ""}
                                </span>
                                {benefit.remaining !== null && (
                                  <span className={`text-[11px] ${benefit.remaining === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                    Sisa: {benefit.remaining}/{benefit.limit ?? "∞"}
                                  </span>
                                )}
                                {!canApply && <span className="text-[11px] text-destructive">Tidak dapat digunakan saat ini</span>}
                                {blockedByQuota && <span className="text-[11px] text-amber-600 dark:text-amber-400">Tidak dapat digabung — layanan sudah gratis dari benefit kuota</span>}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {!bookingCreated ? (
                  <Button size="lg" className="w-full font-display font-bold" onClick={() => setBookingCreated(true)}>
                    Konfirmasi Booking
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      <p className="text-sm font-medium text-primary">
                        Yay! Booking kamu sudah kami terima ฅᨐฅ❤︎<br />
                        Tim Pawship akan segera menghubungi kamu untuk konfirmasi dan detail selanjutnya ya.
                      </p>
                    </div>
                    {selectedStore.contact?.whatsapp && (
                      <a
                        href={`https://wa.me/${selectedStore.contact.whatsapp}?text=${encodeURIComponent(`Halo! Saya ${existingUser ? existingUser.username : userName} sudah booking ${selectedService.name} di ${selectedStore.name} untuk anabul saya (${petLabel})${selectedDate ? ` pada tanggal ${new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}${selectedTimeRange ? ` sesi ${selectedTimeRange}` : ""}${isPickup ? " (pick-up ke lokasi)" : ""}${previewData ? `. Total: ${formatPrice(applyBenefitResult && applyBenefitResult.total_discount > 0 ? applyBenefitResult.final_price : previewData.pricing_breakdown.grand_total)}` : ""} melalui website Pawship.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="lg" className="w-full gap-2 font-display font-bold">
                          <MessageCircle className="h-4 w-4" />
                          Tanyakan via WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={<main className="flex-1 bg-muted/20 py-12" />}>
      <BookingContent />
    </Suspense>
  )
}


