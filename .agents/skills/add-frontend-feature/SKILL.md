---
name: add-frontend-feature
description: Add a new feature or page component to the TaskBoard React frontend following established patterns for state management, API client calls, hooks, and SCSS styling.
---

# Skill: Add Frontend Feature

## Context

The TaskBoard frontend is **React 19 + Vite + TypeScript + SCSS**.

Key files:
- `apps/web/src/App.tsx` — root orchestrator with global state and handlers
- `apps/web/src/api.ts` — typed API client functions (fetch-based)
- `apps/web/src/hooks/` — custom hooks for data fetching and mutations
- `apps/web/src/components/` — page components and UI primitives
- `apps/web/src/styles.scss` — global styles imported from `./styles/colors`

## API Client Pattern

All backend calls go through `apps/web/src/api.ts`. Each function:
1. Accepts a `token: string` (from session) plus domain-specific input.
2. Makes a `fetch()` to `${apiUrl}/...`.
3. Throws `Error` with the response `message` if not ok.
4. Returns typed data.

```ts
export async function myDomainAction(token: string, input: MyInput): Promise<MyResult> {
  const response = await fetch(`${apiUrl}/my-resource`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const { message } = await response.json()
    throw new Error(message ?? 'Erro inesperado')
  }

  return response.json()
}
```

## Custom Hook Pattern

Hooks wrap API calls with local state. They live in `apps/web/src/hooks/`.

```ts
interface UseMyFeatureOptions {
  token: string | null
  someId: string | null
}

export function useMyFeature({ token, someId }: UseMyFeatureOptions) {
  const [items, setItems] = useState<MyItem[]>([])
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !someId) return
    myApiListFunction(token, someId).then(setItems).catch(() => {})
  }, [token, someId])

  async function createItem(input: CreateMyItemInput) {
    if (!token || !someId) return
    setIsSubmitting(true)
    setStatusMessage('')
    try {
      const result = await myApiCreateFunction(token, someId, input)
      setItems(result)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  return { items, statusMessage, isSubmitting, createItem }
}
```

## Component Pattern

Page components receive props from `App.tsx` and are never aware of global session state directly.

```tsx
interface MyFeatureProps {
  token: string
  currentUserId: string
  items: MyItem[]
  isSubmitting: boolean
  onCreateItem: (input: CreateMyItemInput) => Promise<void>
}

export function MyFeature({ token, items, isSubmitting, onCreateItem }: MyFeatureProps) {
  // local UI state only
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div className="my-feature">
      {/* ... */}
    </div>
  )
}
```

## Permissions

Use `hasCompanyPermission(session?.company.permissions, 'PermissionName')` from `apps/web/src/permissions.ts` to conditionally render admin controls.

```tsx
const canManageWorkspace = hasCompanyPermission(session?.company.permissions, 'ManageWorkspace')

{canManageWorkspace && <button>Admin action</button>}
```

## Styling

- Use SCSS in `apps/web/src/styles.scss` — follow the BEM-like class naming already in place.
- Colors come from `apps/web/src/styles/colors.scss` via `@use './styles/colors' as colors`.
- Never use inline styles or Tailwind. All styles go in `.scss` files.

## Routing

Navigation uses `apps/web/src/routing.ts` path creators:
- `createBoardPath(companyId, boardId)` → `/company/:id/board/:id`
- `createFriendlyBoardPath(slug, deptKey, boardKey)` → `/:slug/:deptKey/:boardKey`
- `createFriendlyTaskPath(slug, deptKey, boardKey, friendlyId)` → adds `/tasks/:id`

Navigation is done via `navigateTo()` from `useAppNavigation`.

## Integration checklist

When adding a new feature:
1. Add API function(s) to `api.ts` with full TypeScript types.
2. Create a hook in `hooks/` if the feature needs data fetching or mutation state.
3. Create the component in `components/` with typed props.
4. Wire up the hook in `App.tsx` and pass props down.
5. Add SCSS classes in `styles.scss`.
6. Gate admin-only UI with `hasCompanyPermission`.
