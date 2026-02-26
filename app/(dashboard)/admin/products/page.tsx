"use client"

import { useState } from "react"
import { Plus, Search, Clock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { products } from "@/lib/mock-data"
import { toast } from "sonner"

const categoryColors: Record<string, string> = {
  grooming: "bg-primary/10 text-primary border-primary/20",
  addon: "bg-accent/20 text-accent-foreground border-accent/30",
  spa: "bg-secondary/60 text-secondary-foreground border-secondary/40",
  medical: "bg-destructive/10 text-destructive border-destructive/20",
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

export default function ProductsPage() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter
    return matchesSearch && matchesCat
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Products & Services</h1>
          <p className="text-sm text-muted-foreground">Manage your grooming services and add-ons</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Product</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                toast.success("Product added (demo)")
                setAddOpen(false)
              }}
            >
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input placeholder="Service name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the service..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Category</Label>
                  <Select required>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grooming">Grooming</SelectItem>
                      <SelectItem value="addon">Add-on</SelectItem>
                      <SelectItem value="spa">Spa</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Price (IDR)</Label>
                  <Input type="number" placeholder="150000" required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" placeholder="60" required />
              </div>
              <div className="flex flex-col gap-3">
                <Label>Available for</Label>
                <div className="flex gap-4">
                  {["dog", "cat", "other"].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox id={`pet-${type}`} />
                      <label htmlFor={`pet-${type}`} className="cursor-pointer text-sm capitalize text-foreground">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="active" defaultChecked />
                <Label htmlFor="active">Active</Label>
              </div>
              <Button type="submit" className="font-display font-bold">Add Product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="grooming">Grooming</SelectItem>
            <SelectItem value="addon">Add-on</SelectItem>
            <SelectItem value="spa">Spa</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <Card key={product.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <Badge variant="outline" className={categoryColors[product.category]}>
                    {product.category}
                  </Badge>
                  <h3 className="font-display text-lg font-bold text-foreground">{product.name}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Edit mode (demo)")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{product.duration} min</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {product.petTypes.map((type) => (
                    <span key={type} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {type}
                    </span>
                  ))}
                </div>
                <Badge variant={product.isActive ? "default" : "secondary"} className={product.isActive ? "bg-secondary text-secondary-foreground" : ""}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No products found
          </div>
        )}
      </div>
    </div>
  )
}
