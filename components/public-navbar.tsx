"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { LogOut, Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

const ROLE_MENU: Record<string, { label: string; href: string }[]> = {
  admin: [{ label: "Dashboard", href: "/admin/dashboard" }],
  groomer: [{ label: "Jobs", href: "/groomer/dashboard" }],
  customer: [{ label: "My Order", href: "/customer/order" }],
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin / Ops",
  groomer: "Groomer",
  customer: "Customer",
}

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()

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
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="text-sm font-medium text-foreground/80 hidden lg:block">{user.name}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[user.role] ?? user.role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(ROLE_MENU[user.role] ?? []).map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
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
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-3 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{ROLE_LABEL[user.role] ?? user.role}</span>
                </div>
              </div>
              {(ROLE_MENU[user.role] ?? []).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => { logout(); setMobileOpen(false) }}
                className="flex items-center gap-2 text-sm font-medium text-destructive transition-colors hover:text-destructive/80 w-fit"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <Button asChild size="sm" className="w-fit">
              <Link href="/login">Staff Login</Link>
            </Button>
          )}
        </nav>
      )}
    </header>
  )
}
