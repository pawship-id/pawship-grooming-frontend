"use client"

import { useState } from "react"
import { Plus, Search, Mail, Phone, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { groomers } from "@/lib/mock-data"
import { toast } from "sonner"

export default function GroomersPage() {
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = groomers.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Groomers</h1>
          <p className="text-sm text-muted-foreground">Manage your grooming staff</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Groomer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Groomer</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                toast.success("Groomer added (demo)")
                setAddOpen(false)
              }}
            >
              <div className="flex flex-col gap-2">
                <Label>Full Name</Label>
                <Input placeholder="Full name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@pawship.com" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Phone</Label>
                <Input placeholder="08xxxx" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Specialties</Label>
                <Input placeholder="Large Dogs, Cats (comma separated)" />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="groomer-active" defaultChecked />
                <Label htmlFor="groomer-active">Active</Label>
              </div>
              <Button type="submit" className="font-display font-bold">Add Groomer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groomers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((groomer) => (
          <Card key={groomer.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-display font-bold">
                      {groomer.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-display font-bold text-foreground">{groomer.name}</h3>
                    <Badge
                      variant={groomer.isActive ? "default" : "secondary"}
                      className={groomer.isActive ? "bg-secondary text-secondary-foreground" : ""}
                    >
                      {groomer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Edit mode (demo)")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{groomer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{groomer.phone}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {groomer.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No groomers found
          </div>
        )}
      </div>
    </div>
  )
}
