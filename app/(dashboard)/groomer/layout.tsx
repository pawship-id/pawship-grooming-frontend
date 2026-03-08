"use client"

import React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { LogOut, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV_ITEMS = [
  { label: "My Jobs", href: "/groomer/dashboard", dummy: false },
  { label: "Open Jobs", href: "/groomer/open-jobs", dummy: true },
  { label: "My Profile", href: "/groomer/profile", dummy: false },
]

export default function GroomerLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    } else if (user?.role !== "groomer") {
      if (user?.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/customer/tracking")
      }
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
              alt="Paswhip"
              width={100}
              height={32}
              style={{ width: "auto", height: "auto" }}
              className="h-8"
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
        <nav className="mx-auto flex max-w-4xl gap-1 px-4 pb-0" aria-label="Groomer navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                } ${item.dummy ? "text-red-400 hover:text-red-500" : ""}`}
              >
                {item.label}
                {item.dummy && (
                  <span className="ml-1 text-[10px] text-red-400">(dummy)</span>
                )}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
