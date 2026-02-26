"use client"

import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiRequest } from "@/lib/api/index"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Eye, EyeOff, Home, Check, X } from "lucide-react"

interface RegisterPayload {
  username: string
  email: string
  phone_number: string
  password: string
}

interface RegisterResponse {
  message: string
}

interface ApiValidationError {
  statusCode: number
  message: string | string[]
  error: string
}

function getPasswordStrength(password: string): { label: string; color: string; bars: number; criteria: { label: string; met: boolean }[] } {
  const criteria = [
    { label: "Minimal 8 karakter", met: password.length >= 8 },
    { label: "Huruf kapital (A-Z)", met: /[A-Z]/.test(password) },
    { label: "Angka (0-9)", met: /[0-9]/.test(password) },
    { label: "Karakter khusus (!@#$...)", met: /[^A-Za-z0-9]/.test(password) },
  ]

  if (password.length === 0) return { label: "", color: "", bars: 0, criteria }

  const score = criteria.filter((c) => c.met).length

  if (score <= 1) return { label: "Lemah", color: "bg-red-500", bars: 1, criteria }
  if (score <= 2) return { label: "Sedang", color: "bg-yellow-500", bars: 2, criteria }
  return { label: "Kuat", color: "bg-green-500", bars: 3, criteria }
}

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState<RegisterPayload>({
    username: "",
    email: "",
    phone_number: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setSuccessMessage("")
    setIsLoading(true)

    if (form.password !== confirmPassword) {
      setErrors(["Konfirmasi password tidak cocok."])
      setIsLoading(false)
      return
    }

    try {
      await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      })

      setSuccessMessage("Akun berhasil dibuat! Silakan masuk.")
      setTimeout(() => router.push("/login"), 1500)
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Try to parse array messages from the error string
        try {
          const parsed = JSON.parse(err.message) as ApiValidationError
          const msgs = parsed.message
          if (Array.isArray(msgs)) {
            setErrors(msgs)
          } else {
            setErrors([msgs])
          }
        } catch {
          setErrors([err.message])
        }
      } else {
        setErrors(["Terjadi kesalahan. Silakan coba lagi."])
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="w-full border-border/50 shadow-lg">
          <CardHeader className="flex flex-col items-center gap-2 pb-2">
            <Link href="/">
              <Image
                src="/images/pawship-square-logo.png"
                alt="Pawship Logo"
                width={60}
                height={60}
                className="w-16 object-contain"
              />
            </Link>
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-foreground">Buat Akun Baru</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Daftar untuk mulai menggunakan Pawship
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errors.length > 0 && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@pawship.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone_number">Nomor Telepon</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.password && (() => {
                  const strength = getPasswordStrength(form.password)
                  return (
                    <div className="mt-1 flex flex-col gap-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((bar) => (
                          <div
                            key={bar}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              bar <= strength.bars ? strength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        strength.bars === 1 ? "text-red-500" :
                        strength.bars === 2 ? "text-yellow-500" : "text-green-500"
                      }`}>
                        Kekuatan password: {strength.label}
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {strength.criteria.map((c) => (
                          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${
                            c.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                          }`}>
                            {c.met
                              ? <Check className="h-3 w-3 shrink-0" />
                              : <X className="h-3 w-3 shrink-0 text-red-400" />}
                            {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
                {isLoading ? "Mendaftarkan..." : "Daftar"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Masuk sekarang
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
