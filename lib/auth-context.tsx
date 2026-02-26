"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser } from "./types"
import { authUsers } from "./mock-data"
import { clearAuthToken, loginRequest, setAuthToken } from "./api"

const AUTH_STORAGE_KEY = "pawship-auth"

type LoginResult = { success: boolean; error?: string }

interface TokenPayload {
  _id?: string
  email?: string
  username?: string
  role?: string
  iat?: number
  exp?: number
}

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  isAuthenticated: boolean
}

function parseJwtPayload(token: string): TokenPayload | null {
  const parts = token.split(".")
  if (parts.length < 2) {
    return null
  }

  try {
    const payload = parts[1]
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    const decoded = atob(padded)
    return JSON.parse(decoded) as TokenPayload
  } catch {
    return null
  }
}

function resolveRole(email: string, tokenPayload: TokenPayload | null): AuthUser["role"] {
  const role = tokenPayload?.role
  if (role === "admin" || role === "groomer" || role === "customer") {
    return role
  }

  const fallbackUser = authUsers.find((user) => user.email === email)
  if (fallbackUser) {
    return fallbackUser.role
  }

  return "customer"
}

function mapUserFromToken(emailInput: string, token: string): AuthUser {
  const payload = parseJwtPayload(token)
  const email = payload?.email || emailInput
  const fallbackUser = authUsers.find((user) => user.email === email)

  return {
    id: payload?._id || fallbackUser?.id || email,
    name: payload?.username || fallbackUser?.name || email.split("@")[0],
    email,
    role: resolveRole(email, payload),
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  const router = useRouter()

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await loginRequest(email, password)
        const authenticatedUser = mapUserFromToken(email, response.token)

        setUser(authenticatedUser)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser))
        setAuthToken(response.token)

        if (authenticatedUser.role === "admin") {
          router.push("/admin/dashboard")
        } else if (authenticatedUser.role === "groomer") {
          router.push("/groomer/dashboard")
        } else {
          router.push("/customer/tracking")
        }

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        }
      }
    },
    [router]
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    clearAuthToken()
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
