---
applyTo: "lib/api/**/*.ts"
---

# API Layer Conventions — pawship-grooming-frontend

## Core Request Functions

Always use the two functions from `lib/api/client.ts`. Never call `fetch` directly and never construct the backend URL manually.

```ts
import { apiRequest, apiAuthRequest } from "@/lib/api/client"

// Unauthenticated (public endpoints, login, register)
apiRequest<T>(path, options?)

// Authenticated (all dashboard endpoints — injects Bearer token, handles 401 refresh)
apiAuthRequest<T>(path, options?)
```

## File Structure

Each domain gets its own file: `lib/api/<domain>.ts`. Group related interfaces and functions together in that file.

```
lib/api/
  client.ts        ← core fetch wrappers (do not modify)
  services.ts      ← AdminService interfaces + CRUD functions
  bookings.ts
  users.ts
  pets.ts
  ...
```

## Interface Naming & Shape

Interfaces must use **snake_case** to mirror the backend JSON. Do **not** camelCase-transform API responses.

```ts
// ✅ correct
export interface AdminService {
  _id: string
  name: string
  is_active: boolean
  price_type: "single" | "multiple"
  prices: AdminServicePrice[]
  createdAt: string
  updatedAt: string
}

// ❌ wrong — camelCase fields
export interface AdminService {
  id: string
  priceType: "single" | "multiple"
  isActive: boolean
}
```

## Response Wrapper Interfaces

Always define a typed response wrapper that reflects the `{ message, ...data }` shape the backend returns:

```ts
export interface AdminServicesResponse {
  message: string
  services: AdminService[]
  total: number
  page: number
}
```

## Query Parameters — Always Use URLSearchParams

```ts
export async function getAdminServices(params: GetAdminServicesParams = {}) {
  const query = new URLSearchParams()
  if (params.page)   query.set("page",   String(params.page))
  if (params.search) query.set("search", params.search)
  if (params.is_active !== undefined) query.set("is_active", String(params.is_active))
  const qs = query.toString()
  return apiAuthRequest<AdminServicesResponse>(`/services${qs ? `?${qs}` : ""}`)
}
```

Never build query strings by hand with string concatenation.

## Mutation Functions

```ts
export async function createService(data: CreateServicePayload) {
  return apiAuthRequest<{ message: string; service: AdminService }>("/services", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateService(id: string, data: Partial<CreateServicePayload>) {
  return apiAuthRequest<{ message: string; service: AdminService }>(`/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteService(id: string) {
  return apiAuthRequest<{ message: string }>(`/services/${id}`, {
    method: "DELETE",
  })
}
```

## Request Payload Types

Define a separate `Create*Payload` type for POST/PATCH bodies. Use snake_case matching the backend DTO:

```ts
export interface CreateServicePayload {
  name: string
  description?: string
  is_active: boolean
  price_type: "single" | "multiple"
  service_type_id: string
}
```

## File Upload

Send multipart form data — do **not** set `Content-Type` manually (browser sets boundary automatically):

```ts
export async function uploadFile(file: File, folder: string) {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("folder", folder)
  return apiAuthRequest<{ message: string; url: string; public_id: string }>("/upload-file", {
    method: "POST",
    body: formData,
    // no Content-Type header — let browser set multipart/form-data
  })
}
```

## No Direct Backend URL

Never import or reference `BACKEND_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL` in `lib/api/*.ts` files. The proxy and URL resolution are handled entirely in `app/api/[...path]/route.ts` and `lib/api/client.ts`.
