import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./storage"

interface ApiErrorResponse {
  statusCode?: number
  message?: string | string[]
  error?: string
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean
  skipRefresh?: boolean
}

function getApiBaseUrl() {
  return "/api"
}

function buildApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

function extractErrorMessage(payload: ApiErrorResponse | null, status: number) {
  if (payload?.message) {
    if (Array.isArray(payload.message)) {
      return payload.message.join(", ")
    }

    return payload.message
  }

  return `Request failed (${status})`
}

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const { auth = false, skipRefresh = false, headers, body, ...restOptions } = options
  const requestHeaders = new Headers(headers)

  if (auth) {
    const token = getAccessToken()
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`)
    }
  }

  if (body && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }

  const response = await fetch(buildApiUrl(path), {
    ...restOptions,
    body,
    headers: requestHeaders,
  })

  let payload: TResponse | ApiErrorResponse | null = null

  try {
    payload = (await response.json()) as TResponse | ApiErrorResponse
  } catch {
    payload = null
  }

  if (!response.ok) {
    if (auth && !skipRefresh && response.status === 401) {
      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        clearAuthTokens()
        throw new Error("Sesi login berakhir, silakan login kembali")
      }

      try {
        const refreshResponse = await fetch(buildApiUrl("/auth/refresh"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!refreshResponse.ok) {
          throw new Error("refresh failed")
        }

        const refreshed = (await refreshResponse.json()) as {
          access_token?: string
          refresh_token?: string
        }

        if (!refreshed.access_token || !refreshed.refresh_token) {
          throw new Error("refresh response invalid")
        }

        setAuthTokens(refreshed.access_token, refreshed.refresh_token)

        return apiRequest<TResponse>(path, {
          ...options,
          skipRefresh: true,
        })
      } catch {
        clearAuthTokens()
        throw new Error("Sesi login berakhir, silakan login kembali")
      }
    }

    throw new Error(extractErrorMessage(payload as ApiErrorResponse | null, response.status))
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return payload as TResponse
}

export function apiAuthRequest<TResponse>(path: string, options: Omit<ApiRequestOptions, "auth"> = {}) {
  return apiRequest<TResponse>(path, {
    ...options,
    auth: true,
  })
}
