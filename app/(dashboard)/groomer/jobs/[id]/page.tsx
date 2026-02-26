"use client"

import React from "react"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Play, CheckCircle, AlertTriangle, Camera, Calendar, Clock, User, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { bookings } from "@/lib/mock-data"
import { toast } from "sonner"
import type { JobStatus, PreCondition, BookingMedia } from "@/lib/types"

const jobStatusColors: Record<string, string> = {
  pending: "bg-accent/20 text-accent-foreground",
  started: "bg-primary/10 text-primary",
  finished: "bg-secondary/60 text-secondary-foreground",
}

export default function GroomerJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const booking = bookings.find((b) => b.id === id)

  const [jobStatus, setJobStatus] = useState<JobStatus>(booking?.jobStatus || "pending")
  const [preConditions, setPreConditions] = useState<PreCondition[]>(booking?.preConditions || [])
  const [media, setMedia] = useState<BookingMedia[]>(booking?.media || [])
  const [flagOpen, setFlagOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  if (!booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Job not found</p>
        <Button asChild variant="outline">
          <Link href="/groomer/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const handleStartJob = () => {
    setJobStatus("started")
    toast.success("Job started")
  }

  const handleFinishJob = () => {
    setJobStatus("finished")
    toast.success("Job marked as finished")
  }

  const handleAddCondition = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const description = formData.get("condition") as string
    if (!description) return
    setPreConditions((prev) => [
      ...prev,
      {
        id: `pc-${Date.now()}`,
        description,
        flaggedBy: booking.groomerName,
        flaggedAt: new Date().toISOString(),
      },
    ])
    toast.success("Pre-condition flagged")
    setFlagOpen(false)
  }

  const handleUploadMedia = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const type = formData.get("mediaType") as "before" | "after"
    setMedia((prev) => [
      ...prev,
      {
        id: `media-${Date.now()}`,
        url: "/placeholder.svg?height=400&width=400",
        type,
        uploadedAt: new Date().toISOString(),
      },
    ])
    toast.success(`${type} photo uploaded (demo)`)
    setUploadOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/groomer/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {booking.petName} - {booking.serviceName}
          </h1>
          <p className="text-sm text-muted-foreground">{booking.customerName}</p>
        </div>
        <Badge className={`text-sm ${jobStatusColors[jobStatus]}`}>
          {jobStatus}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {jobStatus === "pending" && (
          <Button onClick={handleStartJob} className="font-display font-bold">
            <Play className="mr-2 h-4 w-4" />
            Start Job
          </Button>
        )}
        {jobStatus === "started" && (
          <Button onClick={handleFinishJob} className="font-display font-bold">
            <CheckCircle className="mr-2 h-4 w-4" />
            Finish Job
          </Button>
        )}

        <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Flag Condition
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Flag Pre-existing Condition</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCondition} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="condition">Description</Label>
                <Textarea
                  id="condition"
                  name="condition"
                  placeholder="Describe the pre-existing condition found..."
                  rows={3}
                  required
                />
              </div>
              <Button type="submit" className="font-display font-bold">Submit Flag</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Upload Photo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Upload Before/After Photo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadMedia} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Photo Type</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="mediaType" value="before" defaultChecked className="accent-[hsl(var(--primary))]" />
                    <span className="text-sm text-foreground">Before</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="mediaType" value="after" className="accent-[hsl(var(--primary))]" />
                    <span className="text-sm text-foreground">After</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="photo">Photo</Label>
                <Input id="photo" type="file" accept="image/*" />
              </div>
              <Button type="submit" className="font-display font-bold">Upload</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Job Details */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Appointment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-foreground">{booking.date}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-foreground">{booking.timeStart} - {booking.timeEnd}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-primary" />
              <span className="text-foreground">{booking.customerName} ({booking.customerStatus})</span>
            </div>
            {booking.type === "home" && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-foreground">Home Visit</span>
              </div>
            )}
            <Badge variant="outline" className="w-fit capitalize">{booking.type}</Badge>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-muted-foreground">Main Service</span>
              <p className="font-medium text-foreground">{booking.serviceName}</p>
            </div>
            {booking.addOnNames.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Add-ons</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {booking.addOnNames.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {booking.requestNotes && (
              <div>
                <span className="text-xs text-muted-foreground">Customer Notes</span>
                <p className="mt-1 rounded-md bg-muted/50 p-2 text-sm text-foreground">{booking.requestNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pre-Conditions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <AlertTriangle className="h-5 w-5 text-accent-foreground" />
            Pre-existing Conditions ({preConditions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preConditions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {preConditions.map((pc) => (
                <div key={pc.id} className="rounded-lg border border-accent/30 bg-accent/10 p-3">
                  <p className="text-sm text-foreground">{pc.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Flagged by {pc.flaggedBy} on {new Date(pc.flaggedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pre-existing conditions flagged</p>
          )}
        </CardContent>
      </Card>

      {/* Media */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Camera className="h-5 w-5 text-primary" />
            Before / After Photos ({media.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {media.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {media.map((m) => (
                <div key={m.id} className="flex flex-col gap-2">
                  <Badge variant="outline" className="w-fit capitalize">{m.type}</Badge>
                  <div className="aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted">
                    <img
                      src={m.url || "/placeholder.svg"}
                      alt={`${m.type} photo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.uploadedAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
