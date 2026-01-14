# Database Scripts

## Seed Script (`seed-db.ts`)

Creates test cases directly in the database for development/testing.

**Usage:**
```bash
cd ui
npm run db:seed
```

This creates 5 test cases with different statuses:
- Case #0: Submitted (Website Redesign)
- Case #1: Submitted (Logo Design)
- Case #2: Funded (ERC-20 Contract)
- Case #3: Disputed (Security Audit)
- Case #4: Resolved (Mobile App Design)

**Note:** Connect wallet `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` (Hardhat Account #0) to see most cases.

---

## Sync Script (`sync-from-contract.ts`)

Syncs the database with the blockchain contract. This is the **source of truth** for on-chain data.

**What it does:**
- Reads all cases from the contract
- Creates new cases in DB if they don't exist
- Updates existing cases with latest on-chain data (status, amounts, hashes)
- Preserves metadata (title, description) that doesn't exist on-chain

**Usage:**
```bash
cd ui
npm run db:sync
```

**When to run:**
- After deploying/seeding the contract
- When cases are created/updated on-chain
- Periodically to keep DB in sync
- Before important operations

---

## Sync Strategy: Handling DB/Contract Desync

### The Problem
The database can get out of sync with the contract when:
- Cases are created directly on-chain (not through the app)
- Status changes happen on-chain (accept, dispute, resolve)
- The app crashes before saving to DB
- Manual contract interactions

### The Solution

**1. Contract is Source of Truth**
- On-chain data (status, amounts, hashes) is authoritative
- Database is a cache/metadata layer

**2. Sync Script**
- Run `npm run db:sync` to resync
- Safe to run multiple times (idempotent)
- Updates existing cases, creates missing ones

**3. Future: Event Listeners (Recommended)**
For production, set up event listeners to automatically sync:
```typescript
// Listen to contract events
contract.on("CaseCreated", (caseId, payer, payee, ...) => {
  // Save to DB immediately
})

contract.on("DisputeOpened", (caseId) => {
  // Update status in DB
})
```

**4. Hybrid Approach (Current)**
- **Reads:** From database (fast, includes metadata)
- **Writes:** To contract (source of truth)
- **Sync:** Manual or scheduled script

### Best Practices

1. **After Contract Operations:**
   ```bash
   # After seeding contract
   npm run seed          # Creates cases on-chain
   cd ui && npm run db:sync  # Syncs to DB
   ```

2. **Before Important Operations:**
   ```bash
   # Sync before running reports/analytics
   npm run db:sync
   ```

3. **Scheduled Sync (Production):**
   - Set up a cron job to run sync every 5-10 minutes
   - Or use event listeners for real-time sync

4. **Manual Sync:**
   - If you notice data mismatch, just run `npm run db:sync`
   - It's safe and won't duplicate data

---

## Troubleshooting

**"No cases to sync"**
- Make sure contract is deployed
- Check `NEXT_PUBLIC_ESCROW_ADDRESS` in `.env.local`
- Verify RPC URL is accessible

**"Case already exists"**
- This is fine! The sync script updates existing cases
- It uses `onConflictDoUpdate` to handle duplicates

**"Database connection error"**
- Check `DATABASE_URL` in `.env.local`
- Verify Neon database is accessible
- Make sure you're in the `ui/` directory

---

## Future Improvements

1. **Automatic Sync on Case Creation**
   - Update `createCase` flow to save to DB immediately after on-chain creation

2. **Event Listeners**
   - Real-time sync when contract events fire
   - No manual sync needed

3. **Sync API Endpoint**
   - `POST /api/cases/sync` to trigger sync from frontend
   - Useful for admin panel

4. **Background Jobs**
   - Scheduled sync every few minutes
   - Queue-based sync for high volume
