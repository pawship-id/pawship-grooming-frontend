export { apiRequest, apiAuthRequest } from "./client"
export { loginRequest, refreshTokenRequest } from "./auth"
export * from "./users"
export * from "./options"
export {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setAuthTokens,
  clearAuthTokens,
} from "./storage"

import {
  ACCESS_TOKEN_STORAGE_KEY,
  getAccessToken,
  setAccessToken,
  clearAuthTokens,
} from "./storage"

export const AUTH_TOKEN_STORAGE_KEY = ACCESS_TOKEN_STORAGE_KEY
export const getAuthToken = getAccessToken
export const setAuthToken = setAccessToken
export const clearAuthToken = clearAuthTokens
