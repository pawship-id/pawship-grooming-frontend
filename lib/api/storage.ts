export const ACCESS_TOKEN_STORAGE_KEY = "pawship-access-token"
export const REFRESH_TOKEN_STORAGE_KEY = "pawship-refresh-token"

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function getRefreshToken() {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  setAccessToken(accessToken)
  setRefreshToken(refreshToken)
}

export function clearAuthTokens() {
  if (typeof window === "undefined") {
    return
  }

  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}
