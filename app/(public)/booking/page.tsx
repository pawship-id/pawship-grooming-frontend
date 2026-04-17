"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Check, Plus, Home, Store } from "lucide-react"
import {
  getPublicStores,
  getPublicServices,
  checkUserByPhone,
  getPublicOptions,
  registerPublicUser,
  addPublicPet,
  getPublicBookingPreview,
  publicApplyBenefitPreview,
  publicApplyPromotionPreview,
  createPublicBooking,
} from "@/lib/api/stores"
import type {
  PublicStore,
  PublicService,
  PublicUser,
  PublicUserPet,
  PublicOption,
  PublicPreviewResult,
  PublicApplyBenefitResult,
  PublicApplyPromotionResult,
} from "@/lib/api/stores"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getCurrentUser } from "@/lib/api/users"

import { ServiceTypeCard } from "./_components/service-type-card"
import { StoreCard } from "./_components/store-card"
import { SelectableServiceCard } from "./_components/selectable-service-card"
import { SelectableAddonCard } from "./_components/selectable-addon-card"
import { StepSchedule } from "./_components/step-schedule"
import { StepUserInfo } from "./_components/step-user-info"
import { StepPreview } from "./_components/step-preview"
import { StepSummary } from "./_components/step-summary"

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

  // ── State Declarations ──────────────────────────────────────────────────

  // Auto-fetch logged-in user data
  const [authDataLoaded, setAuthDataLoaded] = useState(false)

  // Stores from API
  const [stores, setStores] = useState<PublicStore[]>([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [storesError, setStoresError] = useState("")

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

  // Options from API (pet types, breeds, sizes)
  const [petTypes, setPetTypes] = useState<PublicOption[]>([])
  const [breedCategories, setBreedCategories] = useState<PublicOption[]>([])
  const [sizeCategories, setSizeCategories] = useState<PublicOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

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

  // Pick-up & delivery state
  const [isPickup, setIsPickup] = useState(false)
  const [isDelivery, setIsDelivery] = useState(false)

  // Service location type state
  const [selectedLocationType, setSelectedLocationType] = useState<"in home" | "in store" | "">("")

  // Pricing preview state
  const [previewData, setPreviewData] = useState<PublicPreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")

  // Benefit state
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<string[]>([])
  const [applyBenefitResult, setApplyBenefitResult] = useState<PublicApplyBenefitResult | null>(null)
  const [applyBenefitLoading, setApplyBenefitLoading] = useState(false)

  // Promotion state
  const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>([])
  const [applyPromotionResult, setApplyPromotionResult] = useState<PublicApplyPromotionResult | null>(null)
  const [applyPromotionLoading, setApplyPromotionLoading] = useState(false)

  // Booking submit state
  const [bookingCreated, setBookingCreated] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)

  // ── Derived Values ──────────────────────────────────────────────────────

  const selectedStore = stores.find((s) => s._id === selectedStoreId)
  const selectedServiceType = selectedStore?.serviceTypes.find((t) => t._id === selectedServiceTypeId)
  const selectedService = services.find((s) => s._id === selectedServiceId)
  const selectedAddons = addOnServices.filter((a) => selectedAddonIds.includes(a._id))

  // Derived: does this service need a location type choice?
  const serviceLocationTypes = selectedService?.service_location_type ?? []
  const needsLocationChoice = serviceLocationTypes.length > 1
  const locationResolved = selectedLocationType !== ""

  // Derived: can use pickup/delivery?
  const pickupDeliveryIsInStore = selectedLocationType === "in store"
  const pickupDeliveryServiceSupports = selectedService?.is_pickup_delivery_available === true
  const pickupDeliveryStoreSupports = selectedStore?.is_pickup_delivery_available === true
  const pickupDeliveryHasZones = (selectedStore?.pickup_delivery_zones ?? []).length > 0
  const canUsePickupDelivery = pickupDeliveryIsInStore && pickupDeliveryServiceSupports && pickupDeliveryStoreSupports && pickupDeliveryHasZones
  const showPickupDeliverySection = locationResolved && pickupDeliveryIsInStore

  // Dynamic step numbers — add-ons step is skipped when no add-on services exist
  const hasAddons = addOnServices.length > 0
  const stepAddOns = 4
  const stepSchedule = hasAddons ? 5 : 4
  const stepUserInfo = hasAddons ? 6 : 5
  const stepPreview = hasAddons ? 7 : 6
  const stepSummary = hasAddons ? 8 : 7

  // Derived pet label for summary
  const petLabel = existingUser
    ? petMode === "select"
      ? existingPets.find((p) => p._id === selectedPetId)?.name ?? ""
      : newPetName
    : newPetName

  // ── Handlers ────────────────────────────────────────────────────────────

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
    setSelectedLocationType("")
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
    setIsDelivery(false)
    setPreviewData(null)
    setPreviewLoading(false)
    setPreviewError("")
    setSelectedBenefitIds([])
    setApplyBenefitResult(null)
    setApplyBenefitLoading(false)
    setSelectedPromotionIds([])
    setApplyPromotionResult(null)
    setApplyPromotionLoading(false)
    setBookingCreated(false)
    setSubmittingBooking(false)
  }

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

  // Promotion toggle with stacking & conflict detection
  function togglePromotion(id: string) {
    if (!previewData) return
    const promo = previewData.pricing.available_promotions?.find((p) => p._id === id)
    if (!promo) return
    setSelectedPromotionIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (!promo.is_stackable) return [id]
      const hasNonStackable = prev.some((pid) => {
        const p = previewData.pricing.available_promotions?.find((x) => x._id === pid)
        return p && !p.is_stackable
      })
      if (hasNonStackable) return [id]
      return [...prev, id]
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

  async function handleCreateBooking() {
    if (!selectedStoreId || !selectedServiceId || !selectedDate || !selectedTimeRange) return
    setSubmittingBooking(true)
    setFormError("")
    try {
      const locationType = (selectedLocationType || "in store") as "in home" | "in store"
      const payload: Parameters<typeof createPublicBooking>[0] = {
        store_id: selectedStoreId,
        service_id: selectedServiceId,
        service_type_id: selectedServiceTypeId,
        service_addon_ids: selectedAddonIds,
        date: selectedDate,
        time_range: selectedTimeRange,
        type: locationType,
        pick_up: isPickup,
        delivery: isDelivery,
        selected_benefit_ids: selectedBenefitIds,
        selected_promotion_ids: selectedPromotionIds,
        note: "",
      }
      if (existingUser && selectedPetId) {
        payload.customer_id = existingUser._id
        payload.pet_id = selectedPetId
        payload.customer_phone = phone.replace(/\D/g, "")
      } else {
        payload.customer_name = userName
        payload.customer_phone = phone.replace(/\D/g, "")
        payload.customer_email = email
        payload.pet_name = newPetName
        payload.pet_type_id = newPetTypeId
        payload.breed_category_id = newBreedId
        payload.size_category_id = newSizeId
      }
      await createPublicBooking(payload)
      setBookingCreated(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat booking. Coba lagi."
      setFormError(msg)
    } finally {
      setSubmittingBooking(false)
    }
  }

  // ── Effects ─────────────────────────────────────────────────────────────

  // Fetch stores on mount
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
        if (storeIdFromQuery) {
          const store = activeStores.find((s) => s._id === storeIdFromQuery)
          if (store) {
            setSelectedStoreId(store._id)
            if (serviceTypeIdFromQuery) {
              const hasType = store.serviceTypes.some((st) => st._id === serviceTypeIdFromQuery)
              if (hasType) setSelectedServiceTypeId(serviceTypeIdFromQuery)
            }
          }
        } else if (activeStores.length > 0) {
          setSelectedStoreId(activeStores[0]._id)
        }
      })
      .catch(() => setStoresError("Gagal memuat daftar store. Silakan coba lagi."))
      .finally(() => setStoresLoading(false))
  }, [])

  // Fetch services when store + service type are selected
  useEffect(() => {
    if (!selectedStoreId || !selectedServiceTypeId) { setServices([]); return }
    setServicesLoading(true)
    setServicesError("")
    setSelectedServiceId("")
    setSelectedAddonIds([])
    setShowAddons(false)
    getPublicServices(selectedStoreId, selectedServiceTypeId)
      .then((res) => {
        const active = res.services.filter((s) => s.is_active)
        setServices(active)
        if (serviceIdFromQuery && active.some((s) => s._id === serviceIdFromQuery)) {
          setSelectedServiceId(serviceIdFromQuery)
        }
      })
      .catch(() => setServicesError("Gagal memuat layanan. Silakan coba lagi."))
      .finally(() => setServicesLoading(false))
  }, [selectedStoreId, selectedServiceTypeId])

  // Fetch add-on services
  useEffect(() => {
    if (!selectedStoreId) { setAddOnServices([]); return }
    const currentStore = stores.find((s) => s._id === selectedStoreId)
    if (!currentStore) { setAddOnServices([]); return }
    const isAddonsType = currentStore.serviceTypes.find((t) => t._id === selectedServiceTypeId)?.title.toLowerCase() === "addons"
    if (isAddonsType) { setAddOnServices([]); return }
    const addonsTypeId = currentStore.serviceTypes.find((t) => t.title.toLowerCase() === "addons")?._id
    if (!addonsTypeId) { setAddOnServices([]); return }
    setAddOnsLoading(true)
    getPublicServices(selectedStoreId, addonsTypeId)
      .then((res) => setAddOnServices(res.services.filter((s) => s.is_active)))
      .catch(() => setAddOnServices([]))
      .finally(() => setAddOnsLoading(false))
  }, [selectedStoreId, selectedServiceTypeId, stores])

  // Fetch pet options
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
    if (!isAuthenticated) { setAuthDataLoaded(false); return }
    getCurrentUser()
      .then((res) => {
        const u = res.user
        setUserName(u.username)
        setEmail(u.email)
        setPhone(u.phone_number ?? "")
        setPhoneChecked(true)
        setExistingUser({ _id: u._id, username: u.username, email: u.email, phone_number: u.phone_number ?? "", role: u.role ?? "customer" })
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

  // Preview: auto-fetch pricing when user info is confirmed
  useEffect(() => {
    if (!userInfoConfirmed || !selectedServiceId || !selectedDate || !confirmedPetId || !selectedLocationType) {
      setPreviewData(null)
      setPreviewError("")
      setSelectedBenefitIds([])
      setApplyBenefitResult(null)
      setSelectedPromotionIds([])
      setApplyPromotionResult(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewData(null)
    setPreviewError("")
    setSelectedBenefitIds([])
    setApplyBenefitResult(null)
    setSelectedPromotionIds([])
    setApplyPromotionResult(null)
    getPublicBookingPreview({
      pet_id: confirmedPetId,
      service_id: selectedServiceId,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      date: selectedDate,
      time_range: selectedTimeRange || undefined,
      service_location_type: selectedLocationType || undefined,
      pick_up: selectedLocationType === "in store" && isPickup ? true : undefined,
      delivery: selectedLocationType === "in store" && isDelivery ? true : undefined,
      store_id: selectedStoreId || undefined,
      customer_id: existingUser?._id || undefined,
    })
      .then((res) => { if (!cancelled) { setPreviewData(res); setPreviewError("") } })
      .catch((err: unknown) => { if (!cancelled) { setPreviewData(null); setPreviewError(err instanceof Error ? err.message : "Gagal menghitung harga.") } })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [userInfoConfirmed, confirmedPetId, selectedServiceId, selectedAddonIds, selectedDate, selectedTimeRange, selectedLocationType, isPickup, isDelivery])

  // Apply benefit: auto-fetch when benefit selection changes
  useEffect(() => {
    if (!confirmedPetId || !selectedServiceId) return
    if (selectedBenefitIds.length === 0) { setApplyBenefitResult(null); setApplyBenefitLoading(false); return }
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
      pick_up: selectedLocationType === "in store" && isPickup ? true : undefined,
      delivery: selectedLocationType === "in store" && isDelivery ? true : undefined,
    })
      .then((res) => { if (!cancelled) setApplyBenefitResult(res) })
      .catch(() => { if (!cancelled) setApplyBenefitResult(null) })
      .finally(() => { if (!cancelled) setApplyBenefitLoading(false) })
    return () => { cancelled = true }
  }, [selectedBenefitIds, confirmedPetId, selectedServiceId, selectedAddonIds])

  // Apply promotion: auto-fetch when promotion selection changes
  useEffect(() => {
    if (!selectedServiceId || !previewData) return
    if (selectedPromotionIds.length === 0) { setApplyPromotionResult(null); setApplyPromotionLoading(false); return }
    let cancelled = false
    setApplyPromotionLoading(true)
    publicApplyPromotionPreview({
      selected_promotion_ids: selectedPromotionIds,
      service_id: selectedServiceId,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      original_service_price: previewData.pricing.original_service_price,
      travel_fee: (previewData.pricing_breakdown.pickup_fee ?? 0) + (previewData.pricing_breakdown.delivery_fee ?? 0) + (previewData.pricing_breakdown.travel_fee ?? 0),
      grand_total: previewData.pricing_breakdown.grand_total,
      pick_up: selectedLocationType === "in store" && isPickup ? true : undefined,
      delivery: selectedLocationType === "in store" && isDelivery ? true : undefined,
      has_active_membership: previewData.pricing.has_active_membership,
      addon_prices: previewData.pricing.addon_prices,
    })
      .then((res) => { if (!cancelled) setApplyPromotionResult(res) })
      .catch(() => { if (!cancelled) setApplyPromotionResult(null) })
      .finally(() => { if (!cancelled) setApplyPromotionLoading(false) })
    return () => { cancelled = true }
  }, [selectedPromotionIds, selectedServiceId, selectedAddonIds])

  // ── Render ──────────────────────────────────────────────────────────────

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
                <Select value={selectedStoreId} onValueChange={(id) => { setSelectedStoreId(id); resetServiceType() }}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Pilih store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>
                        <div className="flex flex-col text-left">
                          <span className="font-semibold">{store.name}</span>
                          {store.location?.city && <span className="text-xs text-muted-foreground">{store.location.city}</span>}
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
                  <StoreCard key={store._id} store={store} selected={selectedStoreId === store._id} onSelect={() => { setSelectedStoreId(store._id); resetServiceType() }} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Step 2: Service Type ── */}
        {selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={2} title="Pilih Jenis Layanan" done={!!selectedServiceType} />
            {selectedStore.serviceTypes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-6 py-8 text-center">
                <p className="text-sm font-medium text-foreground">Belum ada layanan tersedia di store ini.</p>
                <p className="text-xs text-muted-foreground">Silakan pilih store lain untuk melanjutkan booking.</p>
              </div>
            ) : (
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
                      setSelectedLocationType("")
                      resetUserInfo()
                    }}
                  />
                ))}
              </div>
            )}
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
                      const locs = svc.service_location_type ?? []
                      if (locs.length === 1) {
                        setSelectedLocationType(locs[0] as "in home" | "in store")
                      } else {
                        setSelectedLocationType("")
                      }
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
            <button
              type="button"
              onClick={() => {
                const next = !showAddons
                setShowAddons(next)
                if (!next) { setSelectedAddonIds([]); setUserInfoConfirmed(false); setBookingCreated(false) }
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
                    <SelectableAddonCard key={addon._id} service={addon} selected={selectedAddonIds.includes(addon._id)} onToggle={() => toggleAddon(addon._id)} />
                  ))}
                </div>
              )
            )}
          </section>
        )}

        {/* ── Location Type Selection ── */}
        {selectedService && needsLocationChoice && (
          <section className="flex flex-col gap-4">
            <StepHeader step={hasAddons ? stepAddOns + 1 : stepAddOns} title="Pilih Lokasi Layanan" done={locationResolved} />
            <div className="grid gap-3 sm:grid-cols-2">
              {(["in store", "in home"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedLocationType(type)
                    setIsPickup(false)
                    setIsDelivery(false)
                    setUserInfoConfirmed(false)
                    setBookingCreated(false)
                  }}
                  className={`group relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${
                    selectedLocationType === type ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selectedLocationType === type ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {selectedLocationType === type && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${selectedLocationType === type ? "text-primary" : "text-foreground"}`}>
                      {type === "in store" ? <><Store className="mr-1.5 inline-block h-4 w-4" />In Store</> : <><Home className="mr-1.5 inline-block h-4 w-4" />Home Service</>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {type === "in store" ? "Anabul datang atau dijemput ke store" : "Groomer datang ke lokasi kamu"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Schedule Step ── */}
        {selectedService && locationResolved && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepSchedule} title="Pilih Jadwal" done={!!selectedDate && !!selectedTimeRange} />
            <StepSchedule
              stepNumber={stepSchedule}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTimeRange={selectedTimeRange}
              setSelectedTimeRange={setSelectedTimeRange}
              selectedStore={selectedStore!}
              showPickupDeliverySection={showPickupDeliverySection}
              canUsePickupDelivery={canUsePickupDelivery}
              pickupDeliveryServiceSupports={pickupDeliveryServiceSupports}
              pickupDeliveryStoreSupports={pickupDeliveryStoreSupports}
              pickupDeliveryHasZones={pickupDeliveryHasZones}
              isPickup={isPickup}
              setIsPickup={setIsPickup}
              isDelivery={isDelivery}
              setIsDelivery={setIsDelivery}
              onDateChange={() => { setUserInfoConfirmed(false); setBookingCreated(false) }}
              onTimeChange={() => { setUserInfoConfirmed(false); setBookingCreated(false) }}
              onPickupDeliveryChange={() => { setUserInfoConfirmed(false); setBookingCreated(false) }}
            />
          </section>
        )}

        {/* ── User & Pet Info Step ── */}
        {selectedService && locationResolved && selectedDate && selectedTimeRange && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepUserInfo} title="Informasi Kamu & Anabul" done={userInfoConfirmed} />
            <StepUserInfo
              isAuthenticated={isAuthenticated}
              authDataLoaded={authDataLoaded}
              phone={phone}
              setPhone={setPhone}
              checkingPhone={checkingPhone}
              phoneChecked={phoneChecked}
              phoneError={phoneError}
              handleCheckPhone={handleCheckPhone}
              existingUser={existingUser}
              userName={userName}
              setUserName={setUserName}
              email={email}
              setEmail={setEmail}
              existingPets={existingPets}
              petMode={petMode}
              setPetMode={setPetMode}
              selectedPetId={selectedPetId}
              setSelectedPetId={setSelectedPetId}
              newPetName={newPetName}
              setNewPetName={setNewPetName}
              newPetTypeId={newPetTypeId}
              setNewPetTypeId={setNewPetTypeId}
              newBreedId={newBreedId}
              setNewBreedId={setNewBreedId}
              newSizeId={newSizeId}
              setNewSizeId={setNewSizeId}
              petTypes={petTypes}
              breedCategories={breedCategories}
              sizeCategories={sizeCategories}
              optionsLoading={optionsLoading}
              formError={formError}
              submittingUserInfo={submittingUserInfo}
              userInfoConfirmed={userInfoConfirmed}
              petLabel={petLabel}
              handleConfirmUserInfo={handleConfirmUserInfo}
              resetUserInfo={resetUserInfo}
              onPhoneInputChange={() => {
                setPhoneChecked(false)
                setExistingUser(null)
                setExistingPets([])
                setUserInfoConfirmed(false)
                setBookingCreated(false)
              }}
            />
          </section>
        )}

        {/* ── Preview Harga, Benefit & Promo ── */}
        {userInfoConfirmed && selectedService && selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepPreview} title="Preview Harga, Benefit & Promo" done={!!previewData} />
            <StepPreview
              previewLoading={previewLoading}
              previewData={previewData}
              previewError={previewError}
              selectedBenefitIds={selectedBenefitIds}
              toggleBenefit={toggleBenefit}
              applyBenefitResult={applyBenefitResult}
              applyBenefitLoading={applyBenefitLoading}
              selectedPromotionIds={selectedPromotionIds}
              setSelectedPromotionIds={setSelectedPromotionIds}
              applyPromotionResult={applyPromotionResult}
              applyPromotionLoading={applyPromotionLoading}
              selectedServiceId={selectedServiceId}
              selectedAddonIds={selectedAddonIds}
              selectedLocationType={selectedLocationType}
            />
          </section>
        )}

        {/* ── Ringkasan Booking ── */}
        {userInfoConfirmed && selectedService && selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={stepSummary} title="Ringkasan Booking" done={bookingCreated} />
            <StepSummary
              selectedStore={selectedStore}
              selectedService={selectedService}
              selectedServiceType={selectedServiceType}
              selectedAddons={selectedAddons}
              selectedDate={selectedDate}
              selectedTimeRange={selectedTimeRange}
              selectedLocationType={selectedLocationType}
              isPickup={isPickup}
              isDelivery={isDelivery}
              existingUser={existingUser}
              userName={userName}
              phone={phone}
              petLabel={petLabel}
              previewData={previewData}
              previewLoading={previewLoading}
              selectedBenefitIds={selectedBenefitIds}
              applyBenefitResult={applyBenefitResult}
              selectedPromotionIds={selectedPromotionIds}
              applyPromotionResult={applyPromotionResult}
              bookingCreated={bookingCreated}
              submittingBooking={submittingBooking}
              formError={formError}
              handleCreateBooking={handleCreateBooking}
            />
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
