"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { customers, products, groomers } from "@/lib/mock-data"
import { toast } from "sonner"

export default function NewBookingPage() {
  const router = useRouter()
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedPetId, setSelectedPetId] = useState("")
  const [bookingType, setBookingType] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState("")
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const addOnProducts = products.filter((p) => p.category === "addon" && p.isActive)
  const mainServices = products.filter((p) => p.category !== "addon" && p.isActive)
  const activeGroomers = groomers.filter((g) => g.isActive)

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Booking created successfully (demo)")
    router.push("/admin/bookings")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/bookings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">New Booking</h1>
          <p className="text-sm text-muted-foreground">Create a new grooming appointment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        {/* Schedule */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="timeStart">Start Time</Label>
                <Input id="timeStart" type="time" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="timeEnd">End Time</Label>
                <Input id="timeEnd" type="time" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Booking Type</Label>
              <Select value={bookingType} onValueChange={setBookingType} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-store">In-Store</SelectItem>
                  <SelectItem value="home">Home Grooming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bookingType === "home" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="travelFee">Travel Fee (IDR)</Label>
                <Input id="travelFee" type="number" placeholder="50000" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer & Pet */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Customer & Pet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Customer</Label>
              <Select value={selectedCustomerId} onValueChange={(v) => { setSelectedCustomerId(v); setSelectedPetId("") }}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCustomer && (
              <div className="flex flex-col gap-2">
                <Label>Pet</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger><SelectValue placeholder="Select pet" /></SelectTrigger>
                  <SelectContent>
                    {selectedCustomer.pets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.breed} - {p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Groomer</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Assign groomer" /></SelectTrigger>
                <SelectContent>
                  {activeGroomers.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select defaultValue="not-confirmed">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="not-confirmed">Not Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Service & Add-ons */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Service & Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Main Service</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {mainServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addOnProducts.length > 0 && (
              <div className="flex flex-col gap-3">
                <Label>Add-ons</Label>
                {addOnProducts.map((addon) => (
                  <div key={addon.id} className="flex items-center gap-3">
                    <Checkbox
                      id={addon.id}
                      checked={selectedAddOns.includes(addon.id)}
                      onCheckedChange={() => toggleAddOn(addon.id)}
                    />
                    <label htmlFor={addon.id} className="cursor-pointer text-sm text-foreground">
                      {addon.name} (+{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(addon.price)})
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Notes & Pre-conditions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="requestNotes">Request Notes</Label>
              <Textarea id="requestNotes" placeholder="Any special requests from the customer..." rows={3} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="preConditions">Pre-conditions Before Grooming</Label>
              <Textarea id="preConditions" placeholder="Note any pre-existing conditions..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 lg:col-span-2">
          <Button type="submit" className="font-display font-bold">Create Booking</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/bookings">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
