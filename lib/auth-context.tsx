"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser } from "./types"
import { authUsers } from "./mock-data"

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pawship-auth")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  const router = useRouter()

  const login = useCallback(
    (email: string, _password: string) => {
      // Mock auth: find user by email, any password works
      const found = authUsers.find((u) => u.email === email)
      if (!found) {
        return { success: false, error: "Invalid email or password" }
      }
      setUser(found)
      localStorage.setItem("pawship-auth", JSON.stringify(found))

      // Redirect based on role
      if (found.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/groomer/dashboard")
      }
      return { success: true }
    },
    [router]
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("pawship-auth")
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
