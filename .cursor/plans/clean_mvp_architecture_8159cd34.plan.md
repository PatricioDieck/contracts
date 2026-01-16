---
name: Clean MVP Architecture
overview: Reorganize the codebase into a clean, maintainable structure with centralized service layers, unified types, and a clear sync strategy between blockchain and database.
todos:
  - id: types
    content: Create lib/types/index.ts with unified app types
    status: pending
  - id: env
    content: Create lib/config/env.ts with validated environment
    status: pending
  - id: blockchain
    content: Create lib/services/blockchain.ts with all chain operations
    status: pending
  - id: database
    content: Create lib/services/database.ts with all DB operations
    status: pending
  - id: case-service
    content: Create lib/services/case.ts with business logic
    status: pending
  - id: update-api-cases
    content: Update app/api/cases/route.ts to use services
    status: pending
  - id: update-api-sync
    content: Update app/api/cases/[id]/sync/route.ts to use services
    status: pending
  - id: update-api-resolve
    content: Update app/api/resolve/route.ts to use services
    status: pending
  - id: simplify-hooks
    content: Simplify hooks to just fetch from API
    status: pending
  - id: simplify-components
    content: Simplify case-detail-view.tsx to UI only
    status: pending
  - id: cleanup
    content: Delete redundant files (old lib files, over-engineered components)
    status: pending
---

# Clean MVP Architecture Plan

## Goals

- Centralize blockchain/database logic into service layers
- Define app-owned types (not coupled to contract ABI)
- Implement optimistic sync with background verification
- Minimize boilerplate, maximize clarity
- Make contract changes easy (update one file)

---

## New Structure

```
ui/
├── lib/
│   ├── services/
│   │   ├── blockchain.ts      # Chain reads/writes, ABI mapping
│   │   ├── database.ts        # All Drizzle operations
│   │   └── case.ts            # Business logic combining both
│   ├── types/
│   │   └── index.ts           # Unified app types
│   └── config/
│       └── env.ts             # Validated environment variables
├── app/
│   └── api/                   # Thin routes calling services
├── components/                # UI components (no business logic)
└── hooks/                     # React hooks for data fetching
```

---

## Phase 1: Create Core Infrastructure

### 1.1 Unified Types (`lib/types/index.ts`)

Define app-owned types that are NOT tied to the contract:

```typescript
// Case status as the app sees it
export type CaseStatus = 'funded' | 'submitted' | 'disputed' | 'resolved'

// Sync status for DB/chain reconciliation
export type SyncStatus = 'pending' | 'synced' | 'stale' | 'not_found' | 'error'

// The canonical Case type for the entire app
export interface Case {
  id: number                    // On-chain case ID
  payer: string
  payee: string
  judge: string
  amountEth: string             // Always formatted, never bigint
  status: CaseStatus
  // Metadata (from DB only)
  title?: string
  description?: string
  specsHash: string
  deliverablesHash?: string
  // Sync tracking
  syncStatus: SyncStatus
  lastSyncedAt?: Date
}
```

### 1.2 Environment Config (`lib/config/env.ts`)

Single source for validated env vars:

```typescript
export const env = {
  CHAIN: process.env.NEXT_PUBLIC_CHAIN || 'hardhat',
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545',
  ESCROW_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`,
  AI_JUDGE_ADDRESS: process.env.NEXT_PUBLIC_AI_JUDGE_ADDRESS as `0x${string}`,
  // Server-only
  AI_JUDGE_PRIVATE_KEY: process.env.AI_JUDGE_PRIVATE_KEY,
}
```

---

## Phase 2: Service Layer

### 2.1 Blockchain Service (`lib/services/blockchain.ts`)

All chain interactions in one place. **This is where contract coupling lives.**

Key functions:

- `getPublicClient()` - Singleton viem client
- `readCase(id)` - Read case from chain, return typed Case
- `getNextCaseId()` - Get next case ID
- `isContractDeployed()` - Health check
- Contract ABI and address exports

**Critical:** The `readCase` function maps raw contract data to app types. When the contract changes, update only this function.

### 2.2 Database Service (`lib/services/database.ts`)

All DB operations in one place.

Key functions:

- `getCaseById(id)` - Get case from DB
- `getCasesByWallet(address)` - Get cases for user
- `createCase(data)` - Insert new case
- `updateCase(id, data)` - Update existing case
- `markCaseNotFound(id)` - Mark as not on chain

### 2.3 Case Service (`lib/services/case.ts`)

Business logic combining blockchain + database.

Key functions:

- `syncCase(id)` - Read from chain, update DB, return merged data
- `createCase(chainData, metadata)` - Create on chain + DB
- `getCase(id)` - Get from DB with optional chain verification

---

## Phase 3: Simplified API Routes

Thin routes that delegate to services:

### `app/api/cases/route.ts`

```typescript
// GET: List cases for wallet
export async function GET(req) {
  const wallet = getParam(req, 'wallet')
  return json(await caseService.getCasesByWallet(wallet))
}

// POST: Create case in DB after chain creation
export async function POST(req) {
  const body = await req.json()
  return json(await caseService.createCase(body))
}
```

### `app/api/cases/[id]/sync/route.ts`

```typescript
// POST: Sync single case from chain to DB
export async function POST(req, { params }) {
  return json(await caseService.syncCase(params.id))
}
```

### `app/api/resolve/route.ts`

```typescript
// POST: AI arbitration (streams response)
export async function POST(req) {
  const { caseId } = await req.json()
  return await caseService.resolveDispute(caseId)
}
```

---

## Phase 4: Simplified Hooks

### `hooks/use-case.ts`

```typescript
export function useCase(id: string) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => fetch(`/api/cases/${id}`).then(r => r.json()),
  })
}
```

### `hooks/use-sync-case.ts`

```typescript
export function useSyncCase(id: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => fetch(`/api/cases/${id}/sync`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries(['case', id]),
  })
}
```

---

## Phase 5: Simplified Components

Components should ONLY handle UI. No business logic.

### Current: 657 lines in `case-detail-view.tsx`

### Target: ~200 lines max

Strategy:

- Move all contract/DB logic to services
- Use hooks for data fetching
- Pass data down as props
- Keep components focused on rendering

---

## Files to Create/Modify

### Create New:

- `lib/types/index.ts` - Unified types
- `lib/config/env.ts` - Environment config
- `lib/services/blockchain.ts` - Chain operations
- `lib/services/database.ts` - DB operations
- `lib/services/case.ts` - Business logic

### Simplify Existing:

- `app/api/cases/route.ts` - Thin wrapper
- `app/api/cases/[id]/sync/route.ts` - Thin wrapper
- `app/api/resolve/route.ts` - Use services
- `components/case-detail-view.tsx` - UI only

### Delete:

- `lib/contract.ts` - Replaced by services/blockchain.ts
- `lib/escrow.ts` - Deprecated
- `lib/chain.ts` - Merged into services
- `lib/constants.ts` - Merged into types
- `lib/api-response.ts` - Inline in routes
- `components/case/*.tsx` - Over-engineered for MVP

---

## Migration Strategy

1. Create new files alongside old ones
2. Update one API route at a time to use new services
3. Verify each route works before moving to next
4. Delete old files only after everything works

---

## Sync Strategy Summary

```
CREATE CASE:
1. User submits form
2. Frontend calls contract.createCase()
3. Wait for tx confirmation
4. Parse CaseCreated event for caseId
5. POST /api/cases with metadata + caseId
6. DB stores metadata linked to caseId

VIEW CASE:
1. GET /api/cases/[id] returns DB data
2. If syncStatus is stale, UI calls sync
3. Sync reads chain, updates DB, returns fresh data

MUTATIONS (accept, dispute, submit):
1. Frontend calls contract function
2. Wait for confirmation
3. POST /api/cases/[id]/sync
4. DB updated from chain state
```

---

## Success Criteria

After implementation:

- All chain logic in one file (`services/blockchain.ts`)
- All DB logic in one file (`services/database.ts`)
- API routes are <50 lines each
- Components have no fetch/contract calls
- Contract changes require updating ONE function
- Clear sync flow: chain → DB → UI