---
applyTo: "app/(dashboard)/**/*.tsx"
---

# Dashboard Page Conventions — pawship-grooming-frontend

## Required Directives & Export Shape

Every dashboard page/component file must start with `"use client"` and export a default function named `<Name>Page`:

```tsx
"use client"

export default function AdminServicesPage() {
  // ...
}
```

Sub-components used only by this page are defined **in the same file**, not extracted.

## Auth Guard (layouts only)

Dashboard layouts guard themselves — do not repeat the guard in individual pages:

```tsx
const { user, isLoading } = useAuth()
const router = useRouter()
const [mounted, setMounted] = useState(false)

useEffect(() => { setMounted(true) }, [])
useEffect(() => {
  if (mounted && !isLoading && !user) router.replace('/login')
}, [mounted, isLoading, user, router])

if (!mounted || isLoading) return null
```

## Form State — No react-hook-form

Use controlled `useState` with a `DEFAULT_*_FORM` constant. Do **not** use `react-hook-form`, `zod`, or `@hookform/resolvers`.

```tsx
const DEFAULT_SERVICE_FORM: ServiceForm = {
  name: "",
  is_active: true,
  price_type: "single",
}

const [form, setForm] = useState<ServiceForm>({ ...DEFAULT_SERVICE_FORM })

// Field update
setForm((p) => ({ ...p, name: e.target.value }))

// Reset on success
setForm({ ...DEFAULT_SERVICE_FORM })
```

Always spread (`{ ...DEFAULT_SERVICE_FORM }`) to avoid shared reference mutation.

## Create / Edit Dialogs

Use `<Dialog>` (shadcn/ui) for create and edit forms. Use `<AlertDialog>` for delete confirmations. Use `<Sheet>` for detail/preview panels that need more space.

```tsx
<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tambah Layanan</DialogTitle>
    </DialogHeader>
    {/* form fields */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
      <Button onClick={handleCreate} disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Toasts / Notifications

```tsx
import { toast } from "sonner"

toast.success("Layanan berhasil disimpan")
toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
```

Do **not** add another `<Toaster />` — it is already in `app/layout.tsx`.

## Loading & Async State

Use a local `isLoading` / `isSubmitting` boolean state. Disable submit buttons while submitting:

```tsx
const [isLoading, setIsLoading] = useState(true)
const [isSubmitting, setIsSubmitting] = useState(false)

async function handleCreate() {
  setIsSubmitting(true)
  try {
    await createService(form)
    toast.success("Berhasil")
    setIsCreateOpen(false)
    setForm({ ...DEFAULT_SERVICE_FORM })
    fetchServices()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
  } finally {
    setIsSubmitting(false)
  }
}
```

## UI Component Imports

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
```

Icons from `lucide-react`. Raw `<img>` tags (not `next/image`) are acceptable — eslint-disable comments are already configured.

## Tailwind — Semantic Tokens Only

```tsx
// ✅
<div className="bg-card text-foreground border border-border/50">

// ❌
<div className="bg-white text-gray-700 border border-gray-200">
```

Always use CSS variable tokens. Never use raw Tailwind color names.

## Data Fetching Pattern

Fetch data in a `useEffect` calling an async function defined inside the effect or as a `useCallback`:

```tsx
useEffect(() => {
  fetchServices()
}, [])

async function fetchServices() {
  setIsLoading(true)
  try {
    const res = await getAdminServices({ page, search })
    setServices(res.services)
    setTotal(res.total)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Gagal memuat data")
  } finally {
    setIsLoading(false)
  }
}
```

## Mock Data Warning

Some pages still use `lib/mock-data`. Always verify whether a page is wired to the real API before adding new features. Replace mock data with real API calls when modifying a page.
