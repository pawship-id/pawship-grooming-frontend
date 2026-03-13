# Pawship Grooming Frontend — Workspace Instructions

Next.js 16 (App Router) pet grooming platform. Backend is a separate NestJS service; this repo is **frontend only**.

## Build & Dev Commands

```bash
pnpm dev        # start dev server
pnpm build      # production build (type errors do NOT fail build — ignoreBuildErrors: true)
pnpm lint       # eslint
```

> No test script exists. Use `pnpm lint` to catch issues.

## Architecture

### Route Groups

```
app/
  (auth)/          → login, register — no sidebar
  (dashboard)/
    admin/         → AdminLayout (sidebar + client-side auth guard)
    customer/      → CustomerLayout
    groomer/       → GroomerLayout
  (public)/        → PublicLayout (navbar + footer)
  api/[...path]/   → catch-all proxy to NestJS backend
```

### API Proxy

All API calls go through `app/api/[...path]/route.ts`, which proxies to the NestJS backend. **Never call the backend URL directly from client code.** Backend base URL priority: `BACKEND_API_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL` → `https://api-pawship-grooming.zullstack.dev`.

### Auth

Auth is **client-side only** (no Next.js middleware). JWT decoded manually via `atob`. Tokens and user stored in `localStorage` under keys `pawship-access-token`, `pawship-refresh-token`, `pawship-auth`. Auth state exposed via `useAuth()` from `lib/auth-context.tsx`.

Dashboard layouts auth-guard themselves with a `mounted` + `useEffect` pattern before rendering children.

## Conventions

### API Layer (`lib/api/*.ts`)

Two core functions from `lib/api/client.ts`:

```ts
apiRequest<T>(path, options)       // unauthenticated
apiAuthRequest<T>(path, options)   // Bearer token injected, silent 401 refresh
```

Each domain module defines its own interfaces (snake_case, matching backend JSON) and typed async functions. Build query strings with `URLSearchParams`.

```ts
export async function getAdminServices(params: GetAdminServicesParams = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set("page", String(params.page))
  const qs = query.toString()
  return apiAuthRequest<AdminServicesResponse>(`/services${qs ? `?${qs}` : ""}`)
}
```

### Forms

**Use controlled `useState`, not `react-hook-form`** (installed but not used anywhere). Pattern:

```ts
const DEFAULT_FORM: MyForm = { field: "", is_active: true, ... }
const [form, setForm] = useState<MyForm>(DEFAULT_FORM)

// Field update:
setForm((p) => ({ ...p, fieldName: value }))

// On success reset:
setForm(DEFAULT_FORM)
```

Always define a `DEFAULT_*_FORM` constant for resets/initial state.

### Toasts / Notifications

```ts
import { toast } from "sonner"
toast.success("Berhasil disimpan")
toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
```

`<Toaster />` is mounted once in `app/layout.tsx` — do not add it elsewhere.

### UI Components

- UI primitives: shadcn/ui from `components/ui/` — import as `@/components/ui/<name>`
- Icons: `lucide-react`
- Every interactive page/component must have `"use client"` at the top
- Page files export one default function named `<Name>Page`
- Sub-components that are only used in one page are defined **in the same file** (not extracted)

### TypeScript

- `interface` for object shapes, `type` for unions/aliases
- API shapes in `lib/api/*.ts` use **snake_case** (match backend JSON)
- Shared frontend types in `lib/types.ts` use camelCase
- Components that use API data work directly with snake_case shapes — no mapping layer

### Tailwind

- Use **semantic CSS variable tokens** — never raw color names:
  - ✅ `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border/50`
  - ❌ `text-gray-700`, `bg-white`
- Dark mode via `class` strategy
- `font-sans` (Nunito Sans) for body, `font-display` (Nunito) for headings

## Pitfalls

| Issue | Detail |
|-------|--------|
| `ignoreBuildErrors: true` | TypeScript errors do not fail `pnpm build`. Always run `pnpm lint` to catch issues. |
| Unused form libraries | `react-hook-form`, `zod`, `@hookform/resolvers` are installed but **not used**. Don't introduce them. |
| Mixed mock/real data | Some pages (e.g. `admin/bookings`) still use `lib/mock-data` instead of real API calls. Verify before assuming a page is wired to the backend. |
| Image optimisation disabled | `next/image` optimisation is off project-wide (`unoptimized: true`). Raw `<img>` tags appear with `// eslint-disable-next-line @next/next/no-img-element`. Both are acceptable. |
| UI copy language | Labels and errors are a mix of English and **Indonesian (Bahasa Indonesia)**. Match the language used in the surrounding code. |
| Snake_case API types | Backend responses use snake_case. Do not camelCase-transform them — use them directly. |

## Key Exemplar Files

| File | What it shows |
|------|--------------|
| `lib/api/client.ts` | `apiRequest` / `apiAuthRequest`, token injection, silent 401 refresh |
| `lib/auth-context.tsx` | JWT decode, localStorage persistence, `useAuth`, role-based routing |
| `app/(dashboard)/admin/services/page.tsx` | Full CRUD: controlled form state, `DEFAULT_*` constants, sub-components, sonner, Dialog/Sheet/AlertDialog, image upload, price_type single/multiple schema |
| `app/(dashboard)/admin/layout.tsx` | Auth guard with `mounted` gate, role redirect, SidebarProvider |
| `app/api/[...path]/route.ts` | Catch-all proxy, env-based backend URL, header cleaning |
