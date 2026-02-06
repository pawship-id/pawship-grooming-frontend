"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login")
    } else if (mounted && user?.role !== "admin") {
      router.push("/groomer/dashboard")
    }
  }, [mounted, isAuthenticated, user, router])

  if (!mounted || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-card/80 px-4 backdrop-blur-md md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
