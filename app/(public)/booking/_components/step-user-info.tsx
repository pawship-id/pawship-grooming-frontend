"use client"

import { useState } from "react"
import { User, PawPrint, Loader2, CheckCircle2, LogIn, MapPin, Map, Plus, Pencil, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { PublicUser, PublicUserPet, PublicOption, PublicAddressEntry } from "@/lib/api/stores"
import { EMPTY_ADDRESS_ENTRY } from "@/lib/api/stores"
import { MapPickerModal } from "@/components/map-picker-modal"
import { AddressFormFields } from "@/components/address-form-fields"
import type { GeocodedAddress } from "@/lib/google-geocode"

interface StepUserInfoProps {
  // Auth state
  isAuthenticated: boolean
  authDataLoaded: boolean
  // Phone check
  phone: string
  setPhone: (v: string) => void
  checkingPhone: boolean
  phoneChecked: boolean
  phoneError: string
  handleCheckPhone: () => void
  // User info
  existingUser: PublicUser | null
  userName: string
  setUserName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  // Pet state
  existingPets: PublicUserPet[]
  petMode: "select" | "create"
  setPetMode: (v: "select" | "create") => void
  selectedPetId: string
  setSelectedPetId: (v: string) => void
  newPetName: string
  setNewPetName: (v: string) => void
  newPetTypeId: string
  setNewPetTypeId: (v: string) => void
  newBreedId: string
  setNewBreedId: (v: string) => void
  newSizeId: string
  setNewSizeId: (v: string) => void
  newHairId: string
  setNewHairId: (v: string) => void
  // Options
  petTypes: PublicOption[]
  breedCategories: PublicOption[]
  sizeCategories: PublicOption[]
  hairCategories: PublicOption[]
  optionsLoading: boolean
  // Form state
  formError: string
  submittingUserInfo: boolean
  userInfoConfirmed: boolean
  petLabel: string
  // Handlers
  handleConfirmUserInfo: () => void
  resetUserInfo: () => void
  // Reset callbacks for phone input change
  onPhoneInputChange: () => void
  // Login modal
  showLoginModal: boolean
  setShowLoginModal: (v: boolean) => void
  // Address for location-based services
  needsAddress: boolean
  addresses: PublicAddressEntry[]
  setAddresses: React.Dispatch<React.SetStateAction<PublicAddressEntry[]>>
}

export function StepUserInfo({
  isAuthenticated,
  authDataLoaded,
  phone,
  setPhone,
  checkingPhone,
  phoneChecked,
  phoneError,
  handleCheckPhone,
  existingUser,
  userName,
  setUserName,
  email,
  setEmail,
  existingPets,
  petMode,
  setPetMode,
  selectedPetId,
  setSelectedPetId,
  newPetName,
  setNewPetName,
  newPetTypeId,
  setNewPetTypeId,
  newBreedId,
  setNewBreedId,
  newSizeId,
  setNewSizeId,
  newHairId,
  setNewHairId,
  petTypes,
  breedCategories,
  sizeCategories,
  hairCategories,
  optionsLoading,
  formError,
  submittingUserInfo,
  userInfoConfirmed,
  petLabel,
  handleConfirmUserInfo,
  resetUserInfo,
  onPhoneInputChange,
  showLoginModal: _showLoginModal,
  setShowLoginModal,
  needsAddress,
  addresses,
  setAddresses,
}: StepUserInfoProps) {
  const availablePets = existingPets

  // ── Internal address UI state ───────────────────────────────────────────
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapTargetIdx, setMapTargetIdx] = useState<number | null>(null)
  // Pending reverse-geocode result keyed by address index. Each AddressFormFields
  // consumes its entry via useEffect and clears it via onGeocodeConsumed.
  const [pendingGeocode, setPendingGeocode] = useState<Record<number, GeocodedAddress | null>>({})
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  // ── Address helpers ──────────────────────────────────────────────────────
  function updateAddress(idx: number, patch: Partial<PublicAddressEntry>) {
    setAddresses((prev) =>
      prev.map((a, i) =>
        i === idx
          ? { ...a, ...patch, ...(!a._isNew ? { _isModified: true } : {}) }
          : a,
      ),
    )
  }

  function setMainAddress(idx: number) {
    setAddresses((prev) =>
      prev.map((a, i) => ({
        ...a,
        is_main_address: i === idx,
        ...(!a._isNew && a.is_main_address !== (i === idx) ? { _isModified: true } : {}),
      })),
    )
  }

  function addNewAddress() {
    const newIdx = addresses.length
    setAddresses((prev) => [
      ...prev,
      { ...EMPTY_ADDRESS_ENTRY, is_main_address: prev.length === 0, _isNew: true },
    ])
    setEditingAddressIdx(newIdx)
  }

  function removeAddress(idx: number) {
    setAddresses((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      // if removed was main, promote first remaining
      if (prev[idx]?.is_main_address && next.length > 0) {
        next[0] = { ...next[0], is_main_address: true, _isModified: !next[0]._isNew }
      }
      return next
    })
    setEditingAddressIdx(null)
  }

  function detectLocation(idx: number) {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        updateAddress(idx, { latitude: lat, longitude: lng })
        setIsDetectingLocation(false)
      },
      () => setIsDetectingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // ── Computed values ────────────────────────────────────────────────────
  const mainAddressHasLocation = addresses.some(
    (a) => a.is_main_address && a.latitude != null && a.longitude != null,
  )
  // Show address section when service needs location
  const showAddressSection = needsAddress && ((isAuthenticated && authDataLoaded) || (!isAuthenticated && phoneChecked))

  return (
    <>
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
                  onPhoneInputChange()
                }}
              />
              <Button type="button" variant="outline" disabled={userInfoConfirmed || checkingPhone} onClick={handleCheckPhone}>
                {checkingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cek"}
              </Button>
            </div>
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            <button
              type="button"
              className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline self-start"
              onClick={() => setShowLoginModal(true)}
            >
              <LogIn className="h-3.5 w-3.5" />
              {phoneChecked && existingUser && !existingUser.is_idle
                ? "Akun dengan nomor ini sudah aktif. Login di sini"
                : "Sudah punya akun? Login di sini"}
            </button>
          </div>
        )}

        {/* ── Existing user (idle or active) — can book without login ── */}
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
                <PetCreateFields
                  newPetName={newPetName} setNewPetName={setNewPetName}
                  newPetTypeId={newPetTypeId} setNewPetTypeId={setNewPetTypeId}
                  newBreedId={newBreedId} setNewBreedId={setNewBreedId}
                  newSizeId={newSizeId} setNewSizeId={setNewSizeId}
                  newHairId={newHairId} setNewHairId={setNewHairId}
                  petTypes={petTypes} breedCategories={breedCategories} sizeCategories={sizeCategories} hairCategories={hairCategories}
                  optionsLoading={optionsLoading} userInfoConfirmed={userInfoConfirmed}
                />
              )}
            </div>

            {/* Address section for existing users (idle or active) */}
            {showAddressSection && !isAuthenticated && existingUser && (
              <>
                <Separator />
                <AddressSection
                  addresses={addresses}
                  editingIdx={editingAddressIdx}
                  setEditingIdx={setEditingAddressIdx}
                  onUpdate={updateAddress}
                  onSetMain={setMainAddress}
                  onAddNew={addNewAddress}
                  onRemove={removeAddress}
                  onOpenMap={(idx) => { setMapTargetIdx(idx); setMapOpen(true) }}
                  onDetectLocation={detectLocation}
                  isDetectingLocation={isDetectingLocation}
                  disabled={userInfoConfirmed}
                  pendingGeocode={pendingGeocode}
                  onGeocodeConsumed={(idx) => setPendingGeocode((prev) => ({ ...prev, [idx]: null }))}
                />
              </>
            )}

            {/* Address section for authenticated users */}
            {showAddressSection && isAuthenticated && (
              <>
                <Separator />
                <AddressSection
                  addresses={addresses}
                  editingIdx={editingAddressIdx}
                  setEditingIdx={setEditingAddressIdx}
                  onUpdate={updateAddress}
                  onSetMain={setMainAddress}
                  onAddNew={addNewAddress}
                  onRemove={removeAddress}
                  onOpenMap={(idx) => { setMapTargetIdx(idx); setMapOpen(true) }}
                  onDetectLocation={detectLocation}
                  isDetectingLocation={isDetectingLocation}
                  disabled={userInfoConfirmed}
                  pendingGeocode={pendingGeocode}
                  onGeocodeConsumed={(idx) => setPendingGeocode((prev) => ({ ...prev, [idx]: null }))}
                />
              </>
            )}
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

            <PetCreateFields
              newPetName={newPetName} setNewPetName={setNewPetName}
              newPetTypeId={newPetTypeId} setNewPetTypeId={setNewPetTypeId}
              newBreedId={newBreedId} setNewBreedId={setNewBreedId}
              newSizeId={newSizeId} setNewSizeId={setNewSizeId}
              newHairId={newHairId} setNewHairId={setNewHairId}
              petTypes={petTypes} breedCategories={breedCategories} sizeCategories={sizeCategories} hairCategories={hairCategories}
              optionsLoading={optionsLoading} userInfoConfirmed={userInfoConfirmed}
              showNameFullWidth
            />

            {/* Address section for new users */}
            {showAddressSection && (
              <>
                <Separator />
                <AddressSection
                  addresses={addresses}
                  editingIdx={editingAddressIdx}
                  setEditingIdx={setEditingAddressIdx}
                  onUpdate={updateAddress}
                  onSetMain={setMainAddress}
                  onAddNew={addNewAddress}
                  onRemove={removeAddress}
                  onOpenMap={(idx) => { setMapTargetIdx(idx); setMapOpen(true) }}
                  onDetectLocation={detectLocation}
                  isDetectingLocation={isDetectingLocation}
                  disabled={userInfoConfirmed}
                  pendingGeocode={pendingGeocode}
                  onGeocodeConsumed={(idx) => setPendingGeocode((prev) => ({ ...prev, [idx]: null }))}
                  isNewUser
                />
              </>
            )}
          </>
        )}

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        {!userInfoConfirmed ? (
          <Button
            className="w-full font-display font-bold"
            onClick={handleConfirmUserInfo}
            disabled={
              (!isAuthenticated && !phoneChecked) ||
              submittingUserInfo ||
              (showAddressSection && !mainAddressHasLocation)
            }
          >
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

    {/* Map picker dialog */}
    <MapPickerModal
      open={mapOpen}
      onOpenChange={setMapOpen}
      selectedLat={mapTargetIdx != null ? addresses[mapTargetIdx]?.latitude ?? null : null}
      selectedLng={mapTargetIdx != null ? addresses[mapTargetIdx]?.longitude ?? null : null}
      onSelect={(lat, lng, components) => {
        if (mapTargetIdx != null) {
          updateAddress(mapTargetIdx, { latitude: lat, longitude: lng })
          if (components) {
            setPendingGeocode((prev) => ({ ...prev, [mapTargetIdx]: components }))
          }
        }
      }}
    />
    </>
  )
}

// ── Reusable pet creation fields ───────────────────────────────────────────
function PetCreateFields({
  newPetName, setNewPetName,
  newPetTypeId, setNewPetTypeId,
  newBreedId, setNewBreedId,
  newSizeId, setNewSizeId,
  newHairId, setNewHairId,
  petTypes, breedCategories, sizeCategories, hairCategories,
  optionsLoading, userInfoConfirmed,
  showNameFullWidth,
}: {
  newPetName: string; setNewPetName: (v: string) => void
  newPetTypeId: string; setNewPetTypeId: (v: string) => void
  newBreedId: string; setNewBreedId: (v: string) => void
  newSizeId: string; setNewSizeId: (v: string) => void
  newHairId: string; setNewHairId: (v: string) => void
  petTypes: PublicOption[]; breedCategories: PublicOption[]; sizeCategories: PublicOption[]; hairCategories: PublicOption[]
  optionsLoading: boolean; userInfoConfirmed: boolean
  showNameFullWidth?: boolean
}) {
  const toOptions = (items: PublicOption[]) =>
    items.map((o) => ({ value: o._id, label: o.name }))

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={`flex flex-col gap-1.5 ${showNameFullWidth ? "sm:col-span-2" : ""}`}>
        <Label>Nama Anabul</Label>
        <Input placeholder="Contoh: Mochi" value={newPetName} disabled={userInfoConfirmed} onChange={(e) => setNewPetName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Tipe</Label>
        <Combobox
          options={toOptions(petTypes)}
          value={newPetTypeId}
          onValueChange={(v) => { setNewPetTypeId(v); setNewBreedId("") }}
          placeholder="Pilih tipe"
          searchPlaceholder="Cari tipe..."
          disabled={userInfoConfirmed || optionsLoading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Jenis Bulu</Label>
        <Combobox
          options={toOptions(hairCategories)}
          value={newHairId}
          onValueChange={setNewHairId}
          placeholder="Pilih jenis bulu"
          searchPlaceholder="Cari jenis bulu..."
          disabled={userInfoConfirmed || optionsLoading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Ukuran</Label>
        <Combobox
          options={toOptions(sizeCategories)}
          value={newSizeId}
          onValueChange={setNewSizeId}
          placeholder="Pilih ukuran"
          searchPlaceholder="Cari ukuran..."
          disabled={userInfoConfirmed || optionsLoading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Breed <span className="text-muted-foreground text-xs">(opsional)</span></Label>
        <Combobox
          options={toOptions(breedCategories)}
          value={newBreedId}
          onValueChange={setNewBreedId}
          placeholder="Pilih breed"
          searchPlaceholder="Cari breed..."
          disabled={userInfoConfirmed || optionsLoading}
        />
      </div>
    </div>
  )
}

// ── Address section component ──────────────────────────────────────────────
function AddressSection({
  addresses,
  editingIdx,
  setEditingIdx,
  onUpdate,
  onSetMain,
  onAddNew,
  onRemove,
  onOpenMap,
  onDetectLocation,
  isDetectingLocation,
  disabled,
  isNewUser,
  pendingGeocode,
  onGeocodeConsumed,
}: {
  addresses: PublicAddressEntry[]
  editingIdx: number | null
  setEditingIdx: (v: number | null) => void
  onUpdate: (idx: number, patch: Partial<PublicAddressEntry>) => void
  onSetMain: (idx: number) => void
  onAddNew: () => void
  onRemove: (idx: number) => void
  onOpenMap: (idx: number) => void
  onDetectLocation: (idx: number) => void
  isDetectingLocation: boolean
  disabled: boolean
  isNewUser?: boolean
  pendingGeocode?: Record<number, GeocodedAddress | null>
  onGeocodeConsumed?: (idx: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Alamat</p>
        {isNewUser && (
          <span className="text-xs text-muted-foreground">— digunakan untuk menghitung biaya pickup/delivery</span>
        )}
      </div>

      {addresses.length === 0 && (
        <p className="text-xs text-muted-foreground">Belum ada alamat tersimpan.</p>
      )}

      {addresses.map((addr, idx) => (
        <div key={addr._id ?? idx} className="border rounded-md bg-muted/30">
          {(!isNewUser && editingIdx === idx) ? (
            // ── Expanded edit form (idle user list) ──
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`main_addr_${idx}`}
                  checked={addr.is_main_address}
                  disabled={disabled}
                  onChange={() => onSetMain(idx)}
                  className="cursor-pointer"
                />
                <Label htmlFor={`main_addr_${idx}`} className="text-xs font-medium cursor-pointer">Alamat Utama</Label>
                <div className="ml-auto flex items-center gap-1">
                  {addr._isNew && (
                    <Button type="button" size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => onRemove(idx)}>
                      Batalkan
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingIdx(null)}>
                    Selesai
                  </Button>
                </div>
              </div>
              <AddressFields
                idx={idx}
                addr={addr}
                onUpdate={onUpdate}
                onOpenMap={onOpenMap}
                disabled={disabled}
                pendingGeocode={pendingGeocode?.[idx]}
                onGeocodeConsumed={() => onGeocodeConsumed?.(idx)}
              />
            </div>
          ) : isNewUser ? (
            // ── Inline form for new user (no collapse/radio) ──
            <div className="p-3">
              <AddressFields
                idx={idx}
                addr={addr}
                onUpdate={onUpdate}
                onOpenMap={onOpenMap}
                disabled={disabled}
                pendingGeocode={pendingGeocode?.[idx]}
                onGeocodeConsumed={() => onGeocodeConsumed?.(idx)}
              />
            </div>
          ) : (
            // ── Collapsed row (idle user list) ──
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="radio"
                id={`main_addr_collapsed_${idx}`}
                checked={addr.is_main_address}
                disabled={disabled}
                onChange={() => onSetMain(idx)}
                className="shrink-0 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor={`main_addr_collapsed_${idx}`} className="flex items-center gap-1 mb-0.5 cursor-pointer">
                  {addr.is_main_address && <span className="text-xs text-primary font-semibold">Utama</span>}
                  <span className="text-xs font-medium">{addr.label || "Alamat"}</span>
                </label>
                <p className="text-xs text-muted-foreground truncate">
                  {[addr.street, addr.district, addr.city, addr.province].filter(Boolean).join(", ") || "—"}
                </p>
                {addr.latitude == null && (
                  <p className="text-xs text-amber-600">⚠ Lokasi belum ditentukan di peta</p>
                )}
              </div>
              {!disabled && (
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingIdx(idx)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {!isNewUser && !disabled && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={onAddNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Alamat
        </Button>
      )}
    </div>
  )
}

// ── Address fields form ────────────────────────────────────────────────────
function AddressFields({
  idx,
  addr,
  onUpdate,
  onOpenMap,
  disabled,
  pendingGeocode,
  onGeocodeConsumed,
}: {
  idx: number
  addr: PublicAddressEntry
  onUpdate: (idx: number, patch: Partial<PublicAddressEntry>) => void
  onOpenMap: (idx: number) => void
  disabled: boolean
  pendingGeocode?: GeocodedAddress | null
  onGeocodeConsumed?: () => void
}) {
  return (
    <AddressFormFields
      variant="user"
      idPrefix={`addr-${idx}`}
      value={addr}
      disabled={disabled}
      onChange={(patch) => onUpdate(idx, patch as Partial<PublicAddressEntry>)}
      onOpenMap={() => onOpenMap(idx)}
      pendingGeocode={pendingGeocode}
      onGeocodeConsumed={onGeocodeConsumed}
    />
  )
}
