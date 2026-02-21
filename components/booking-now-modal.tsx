"use client"

import { useState } from "react"
import type { Product, PetType } from "@/lib/types"
import { customers } from "@/lib/mock-data"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BookingNowModalProps {
  product: Product
  buttonLabel?: string
  buttonVariant?: ButtonProps["variant"]
  buttonSize?: ButtonProps["size"]
  buttonClassName?: string
}

export function BookingNowModal({
  product,
  buttonLabel = "Booking Now",
  buttonVariant = "default",
  buttonSize = "default",
  buttonClassName,
}: BookingNowModalProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [phoneChecked, setPhoneChecked] = useState(false)
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null)
  const [userName, setUserName] = useState("")
  const [email, setEmail] = useState("")
  const [petMode, setPetMode] = useState<"select" | "create">("select")
  const [selectedPetId, setSelectedPetId] = useState("")
  const [newPetName, setNewPetName] = useState("")
  const [newPetType, setNewPetType] = useState<PetType>("dog")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const existingCustomer = existingCustomerId ? customers.find((customer) => customer.id === existingCustomerId) : null
  const availablePets = existingCustomer
    ? existingCustomer.pets.filter((pet) => product.petTypes.includes(pet.type))
    : []

  const resetForm = () => {
    setPhone("")
    setPhoneChecked(false)
    setExistingCustomerId(null)
    setUserName("")
    setEmail("")
    setPetMode("select")
    setSelectedPetId("")
    setNewPetName("")
    setNewPetType("dog")
    setErrorMessage("")
    setSuccessMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleCheckPhone = () => {
    const normalizedPhone = phone.replace(/\D/g, "")
    if (!normalizedPhone) {
      setErrorMessage("Nomor HP wajib diisi.")
      setPhoneChecked(false)
      setExistingCustomerId(null)
      return
    }

    const customer = customers.find((item) => item.phone.replace(/\D/g, "") === normalizedPhone)
    setPhoneChecked(true)
    setExistingCustomerId(customer?.id || null)
    setErrorMessage("")
    setSuccessMessage("")

    if (customer) {
      const petsForService = customer.pets.filter((pet) => product.petTypes.includes(pet.type))
      if (petsForService.length > 0) {
        setPetMode("select")
        setSelectedPetId(petsForService[0].id)
      } else {
        setPetMode("create")
        setSelectedPetId("")
      }
      setUserName(customer.name)
      setEmail(customer.email)
    } else {
      setPetMode("select")
      setSelectedPetId("")
      setUserName("")
      setEmail("")
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!phoneChecked) {
      setErrorMessage("Silakan cek nomor HP terlebih dahulu.")
      return
    }

    if (!existingCustomer) {
      if (!userName.trim() || !email.trim()) {
        setErrorMessage("Nama user dan email wajib diisi untuk nomor baru.")
        return
      }
      setErrorMessage("")
      setSuccessMessage(`Permintaan booking ${product.name} berhasil dibuat untuk ${userName}.`)
      return
    }

    if (petMode === "select" && !selectedPetId) {
      setErrorMessage("Silakan pilih pet untuk booking.")
      return
    }

    if (petMode === "create" && !newPetName.trim()) {
      setErrorMessage("Nama pet baru wajib diisi.")
      return
    }

    setErrorMessage("")
    const petLabel =
      petMode === "select"
        ? existingCustomer.pets.find((pet) => pet.id === selectedPetId)?.name || "pet"
        : newPetName

    setSuccessMessage(`Permintaan booking ${product.name} untuk ${petLabel} berhasil dibuat.`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Booking Now</DialogTitle>
          <DialogDescription>
            Isi data singkat untuk booking layanan {product.name}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="booking-phone">Nomor HP</Label>
            <div className="flex gap-2">
              <Input
                id="booking-phone"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setPhoneChecked(false)
                  setExistingCustomerId(null)
                  setSuccessMessage("")
                }}
              />
              <Button type="button" variant="outline" onClick={handleCheckPhone}>
                Cek
              </Button>
            </div>
          </div>

          {phoneChecked && !existingCustomer && (
            <>
              <div className="space-y-2">
                <Label htmlFor="booking-user-name">User Name</Label>
                <Input
                  id="booking-user-name"
                  placeholder="Nama lengkap"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-email">Email</Label>
                <Input
                  id="booking-email"
                  type="email"
                  placeholder="email@domain.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </>
          )}

          {phoneChecked && existingCustomer && (
            <div className="space-y-4 rounded-md border border-border/60 p-4">
              <p className="text-sm text-muted-foreground">
                Nomor terdaftar atas nama <span className="font-semibold text-foreground">{existingCustomer.name}</span>
              </p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={petMode === "select" ? "default" : "outline"}
                  onClick={() => setPetMode("select")}
                >
                  Select Pet
                </Button>
                <Button
                  type="button"
                  variant={petMode === "create" ? "default" : "outline"}
                  onClick={() => setPetMode("create")}
                >
                  Create Pet
                </Button>
              </div>

              {petMode === "select" ? (
                <div className="space-y-2">
                  <Label>Pilih Pet</Label>
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availablePets.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tidak ada pet yang cocok untuk layanan ini. Silakan buat pet baru.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-pet-name">Nama Pet</Label>
                    <Input
                      id="new-pet-name"
                      placeholder="Contoh: Mochi"
                      value={newPetName}
                      onChange={(event) => setNewPetName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipe Pet</Label>
                    <Select value={newPetType} onValueChange={(value) => setNewPetType(value as PetType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe pet" />
                      </SelectTrigger>
                      <SelectContent>
                        {product.petTypes.map((petType) => (
                          <SelectItem key={petType} value={petType}>
                            {petType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          {successMessage && <p className="text-sm text-primary">{successMessage}</p>}

          <Button type="submit" className="w-full">
            Submit Booking
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}