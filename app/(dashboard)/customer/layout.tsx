"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ClipboardList, LogOut } from "lucide-react"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/customer/order" className="flex items-center gap-2">
            <Image
              src="/images/pawship-navbar-logo.webp"
              alt="Paswhip"
              width={100}
              height={32}
              style={{ width: "auto", height: "auto" }}
              className="h-8"
            />
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant={pathname === "/customer/order" ? "default" : "ghost"} size="sm">
              <Link href="/customer/order">
                <ClipboardList className="h-4 w-4" />
                Order
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
