"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/pawship-navbar-logo.webp"
            alt="Paswhip"
            width={110}
            height={36}
            style={{ width: "auto", height: "auto" }}
            className="h-9"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <Link href="/#services" className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary">
            Services
          </Link>
          <Link href="/#about" className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary">
            About
          </Link>
          <Link href="/#contact" className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary">
            Contact
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-md p-2 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button asChild size="sm">
            <Link href="/login">Login</Link>
          </Button>
        </nav>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-4 border-t border-border/50 bg-card px-6 py-4 md:hidden" aria-label="Mobile navigation">
          <Link
            href="/#services"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
            onClick={() => setMobileOpen(false)}
          >
            Services
          </Link>
          <Link
            href="/#about"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
            onClick={() => setMobileOpen(false)}
          >
            About
          </Link>
          <Link
            href="/#contact"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
            onClick={() => setMobileOpen(false)}
          >
            Contact
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <Button asChild size="sm" className="w-fit">
            <Link href="/login">Staff Login</Link>
          </Button>
        </nav>
      )}
    </header>
  )
}
