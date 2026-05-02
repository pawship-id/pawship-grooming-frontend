"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AuthUser } from "./types";
import { authUsers } from "./mock-data";
import { clearAuthTokens, loginRequest, setAuthTokens } from "./api/index";
import { SESSION_EXPIRED_EVENT } from "./api/client";

const AUTH_STORAGE_KEY = "pawship-auth";

type LoginResult = { success: boolean; error?: string };

interface TokenPayload {
  _id?: string;
  email?: string;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginSilent: (email: string, password: string) => Promise<LoginResult>;
  loginWithTokens: (email: string, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

function parseJwtPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as TokenPayload;
  } catch {
    return null;
  }
}

function resolveRole(
  email: string,
  tokenPayload: TokenPayload | null,
): AuthUser["role"] {
  const role = tokenPayload?.role;
  if (
    role === "admin" ||
    role === "groomer" ||
    role === "customer" ||
    role === "ops"
  ) {
    return role;
  }

  const fallbackUser = authUsers.find((user) => user.email === email);
  if (fallbackUser) {
    return fallbackUser.role;
  }

  return "customer";
}

function mapUserFromToken(emailInput: string, token: string): AuthUser {
  const payload = parseJwtPayload(token);
  const email = payload?.email || emailInput;
  const fallbackUser = authUsers.find((user) => user.email === email);

  return {
    id: payload?._id || fallbackUser?.id || email,
    name: payload?.username || fallbackUser?.name || email.split("@")[0],
    email,
    role: resolveRole(email, payload),
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await loginRequest(email, password);
        const authenticatedUser = mapUserFromToken(
          email,
          response.access_token,
        );

        setUser(authenticatedUser);
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(authenticatedUser),
        );
        setAuthTokens(response.access_token, response.refresh_token);

        if (
          authenticatedUser.role === "admin" ||
          authenticatedUser.role === "ops"
        ) {
          router.push("/admin/dashboard");
        } else if (authenticatedUser.role === "groomer") {
          router.push("/groomer/dashboard");
        } else {
          router.push("/customer");
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    },
    [router],
  );

  /** Set auth state from existing tokens — used after registration */
  const loginWithTokens = useCallback(
    (email: string, accessToken: string, refreshToken: string) => {
      const authenticatedUser = mapUserFromToken(email, accessToken);
      setUser(authenticatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
      setAuthTokens(accessToken, refreshToken);
    },
    [],
  );

  /** Authenticate and set tokens without redirecting — used by inline login modals */
  const loginSilent = useCallback(async (email: string, password: string) => {
    try {
      const response = await loginRequest(email, password);
      const authenticatedUser = mapUserFromToken(email, response.access_token);

      setUser(authenticatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
      setAuthTokens(response.access_token, response.refresh_token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    clearAuthTokens();
    router.push("/login");
  }, [router]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      toast.error("Sesi login berakhir, silakan login kembali");
      router.push("/login");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginSilent,
        loginWithTokens,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
