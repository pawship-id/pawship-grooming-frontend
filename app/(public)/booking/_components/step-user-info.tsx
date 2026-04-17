"use client"

import { User, PawPrint, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { PublicUser, PublicUserPet, PublicOption } from "@/lib/api/stores"

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
  // Options
  petTypes: PublicOption[]
  breedCategories: PublicOption[]
  sizeCategories: PublicOption[]
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
  petTypes,
  breedCategories,
  sizeCategories,
  optionsLoading,
  formError,
  submittingUserInfo,
  userInfoConfirmed,
  petLabel,
  handleConfirmUserInfo,
  resetUserInfo,
  onPhoneInputChange,
}: StepUserInfoProps) {
  const availablePets = existingPets

  return (
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
                <PetCreateFields
                  newPetName={newPetName} setNewPetName={setNewPetName}
                  newPetTypeId={newPetTypeId} setNewPetTypeId={setNewPetTypeId}
                  newBreedId={newBreedId} setNewBreedId={setNewBreedId}
                  newSizeId={newSizeId} setNewSizeId={setNewSizeId}
                  petTypes={petTypes} breedCategories={breedCategories} sizeCategories={sizeCategories}
                  optionsLoading={optionsLoading} userInfoConfirmed={userInfoConfirmed}
                />
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

            <PetCreateFields
              newPetName={newPetName} setNewPetName={setNewPetName}
              newPetTypeId={newPetTypeId} setNewPetTypeId={setNewPetTypeId}
              newBreedId={newBreedId} setNewBreedId={setNewBreedId}
              newSizeId={newSizeId} setNewSizeId={setNewSizeId}
              petTypes={petTypes} breedCategories={breedCategories} sizeCategories={sizeCategories}
              optionsLoading={optionsLoading} userInfoConfirmed={userInfoConfirmed}
              showNameFullWidth
            />
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
  )
}

// ── Reusable pet creation fields ───────────────────────────────────────────
function PetCreateFields({
  newPetName, setNewPetName,
  newPetTypeId, setNewPetTypeId,
  newBreedId, setNewBreedId,
  newSizeId, setNewSizeId,
  petTypes, breedCategories, sizeCategories,
  optionsLoading, userInfoConfirmed,
  showNameFullWidth,
}: {
  newPetName: string; setNewPetName: (v: string) => void
  newPetTypeId: string; setNewPetTypeId: (v: string) => void
  newBreedId: string; setNewBreedId: (v: string) => void
  newSizeId: string; setNewSizeId: (v: string) => void
  petTypes: PublicOption[]; breedCategories: PublicOption[]; sizeCategories: PublicOption[]
  optionsLoading: boolean; userInfoConfirmed: boolean
  showNameFullWidth?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={`flex flex-col gap-1.5 ${showNameFullWidth ? "sm:col-span-2" : ""}`}>
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
  )
}
