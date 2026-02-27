"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    } else if (user?.role !== "customer") {
      if (user?.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/groomer/dashboard")
      }
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || user?.role !== "customer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <PublicFooter />
    </div>
  )
}
