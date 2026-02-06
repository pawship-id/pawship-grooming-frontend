"use client"

import React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { LogOut, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GroomerLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    } else if (user?.role !== "groomer") {
      router.push("/admin/dashboard")
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || user?.role !== "groomer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/groomer/dashboard" className="flex items-center gap-2">
            <Image
              src="/images/pawship-navbar-logo.webp"
              alt="PAWship"
              width={100}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Scissors className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{user.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
