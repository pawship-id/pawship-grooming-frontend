export const AUTH_TOKEN_STORAGE_KEY = "pawship-token"

interface ApiErrorResponse {
	statusCode?: number
	message?: string
	error?: string
}

export interface LoginResponse {
	message: string
	token: string
}

interface ApiRequestOptions extends RequestInit {
	auth?: boolean
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

export function getAuthToken() {
	if (typeof window === "undefined") {
		return null
	}

	return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string) {
	if (typeof window === "undefined") {
		return
	}

	localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
	if (typeof window === "undefined") {
		return
	}

	localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
	const { auth = false, headers, body, ...restOptions } = options
	const requestHeaders = new Headers(headers)

	if (auth) {
		const token = getAuthToken()
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
		const errorMessage =
			typeof payload === "object" &&
			payload !== null &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Request failed (${response.status})`
		throw new Error(errorMessage)
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

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
	const payload = await apiRequest<LoginResponse>("/auth/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	})

	if (!payload?.token) {
		throw new Error("Token tidak ditemukan pada response login")
	}

	return payload
}
