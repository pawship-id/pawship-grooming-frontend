"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { customers } from "@/lib/mock-data"

const tierColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800 border-amber-200",
  silver: "bg-gray-100 text-gray-700 border-gray-200",
  gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  platinum: "bg-violet-100 text-violet-800 border-violet-200",
}

export default function CustomersPage() {
  const [search, setSearch] = useState("")

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customer profiles and their pets</p>
        </div>
        <Button onClick={() => { /* demo */ }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((customer) => (
          <Link key={customer.id} href={`/admin/customers/${customer.id}`}>
            <Card className="h-full border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{customer.name}</h3>
                    <Badge variant="outline" className={`mt-1 capitalize ${tierColors[customer.loyaltyTier]}`}>
                      {customer.loyaltyTier}
                    </Badge>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {customer.pets.length} {customer.pets.length === 1 ? "pet" : "pets"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{customer.area}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.pets.map((pet) => (
                    <span
                      key={pet.id}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {pet.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No customers found
          </div>
        )}
      </div>
    </div>
  )
}
