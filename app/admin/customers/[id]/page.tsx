"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Mail, Phone, MapPin, Star, Calendar, Weight, Ruler, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { customers } from "@/lib/mock-data"
import { toast } from "sonner"

const tierColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-gray-100 text-gray-700",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-violet-100 text-violet-800",
}

const membershipStatusColors: Record<string, string> = {
  active: "bg-secondary/60 text-secondary-foreground",
  expired: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const customer = customers.find((c) => c.id === id)
  const [addPetOpen, setAddPetOpen] = useState(false)

  if (!customer) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Customer not found</p>
        <Button asChild variant="outline">
          <Link href="/admin/customers">Back to Customers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/customers"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{customer.name}</h1>
            <Badge className={`mt-1 capitalize ${tierColors[customer.loyaltyTier]}`}>
              {customer.loyaltyTier} Member
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => toast.success("Edit mode (demo)")}>Edit Customer</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-foreground">{customer.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-foreground">{customer.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-foreground">{customer.address}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Member since {customer.createdAt}</span>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Loyalty</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-accent-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Points</p>
                <p className="font-display text-2xl font-bold text-foreground">{customer.loyaltyPoints}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <Badge className={`mt-1 capitalize ${tierColors[customer.loyaltyTier]}`}>
                {customer.loyaltyTier}
              </Badge>
            </div>
            {customer.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm text-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Area */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Area / Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Assigned Area</p>
              <p className="font-display text-lg font-bold text-foreground">{customer.area}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pets Section */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">
          Pets ({customer.pets.length})
        </h2>
        <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Pet</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                toast.success("Pet added (demo)")
                setAddPetOpen(false)
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Pet Name</Label>
                  <Input placeholder="Buddy" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Type</Label>
                  <Select required>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">Dog</SelectItem>
                      <SelectItem value="cat">Cat</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Breed</Label>
                  <Input placeholder="Golden Retriever" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Birthday</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" placeholder="10" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Size Category</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Special Notes</Label>
                <Textarea placeholder="Any special notes about the pet..." rows={2} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tags / Flags</Label>
                <Input placeholder="friendly, noise-sensitive (comma separated)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Membership Tier</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Membership Status</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Membership Start</Label>
                  <Input type="date" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Membership End</Label>
                  <Input type="date" />
                </div>
              </div>
              <Button type="submit" className="font-display font-bold">Add Pet</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {customer.pets.map((pet) => (
          <Card key={pet.id} className="border-border/50">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{pet.name}</h3>
                  <p className="text-sm capitalize text-muted-foreground">{pet.type} - {pet.breed}</p>
                </div>
                <Badge className={membershipStatusColors[pet.membershipStatus]}>
                  {pet.membershipTier} ({pet.membershipStatus})
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{pet.birthday || "No birthday"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{pet.weight} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="capitalize text-foreground">{pet.sizeCategory}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">
                    {pet.membershipStart} - {pet.membershipEnd}
                  </span>
                </div>
              </div>

              {pet.notes && (
                <p className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">{pet.notes}</p>
              )}

              {pet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pet.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
