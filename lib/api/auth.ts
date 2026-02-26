import { apiRequest } from "./client"

export interface AuthTokensResponse {
  message: string
  access_token: string
  refresh_token: string
}

export async function loginRequest(email: string, password: string): Promise<AuthTokensResponse> {
  const payload = await apiRequest<AuthTokensResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })

  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("Token tidak ditemukan pada response login")
  }

  return payload
}

export async function refreshTokenRequest(refreshToken: string): Promise<AuthTokensResponse> {
  const payload = await apiRequest<AuthTokensResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("Token tidak ditemukan pada response refresh")
  }

  return payload
}
