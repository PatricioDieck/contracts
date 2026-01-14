# BabyBitcoin UI

The frontend for the AI-arbitrated escrow system.

---

## Quick Start

```bash
# Make sure you're in the ui/ folder
cd ui

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open http://localhost:3000

**Note:** The blockchain must be running first. From the parent `contracts/` folder, run `make node` then `make seed`.

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check for linting errors

# Database commands
npm run db:seed      # Populate database with test cases
npm run db:sync      # Sync database from blockchain  
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (visual DB explorer)
```

---

## Project Structure

```
ui/
├── app/
│   ├── page.tsx              # Home page (redirects to /cases)
│   ├── cases/
│   │   ├── page.tsx          # Cases list
│   │   ├── new/page.tsx      # Create new case
│   │   └── [id]/page.tsx     # Case detail view
│   ├── api/
│   │   ├── cases/            # GET/POST cases
│   │   ├── deliverables/     # File upload
│   │   └── resolve/          # AI arbitration
│   └── providers.tsx         # Wagmi + RainbowKit setup
│
├── components/
│   ├── dashboard-layout.tsx  # Main layout with sidebar
│   ├── case-detail-view.tsx  # Single case page
│   ├── new-case-form.tsx     # Create case form
│   └── ai-arbitration-panel.tsx  # AI streaming UI
│
├── db/
│   ├── schema.ts             # Database tables (Drizzle)
│   └── db.ts                 # Database connection
│
├── hooks/
│   ├── use-cases.ts          # Fetch all cases
│   └── use-case.ts           # Fetch single case
│
└── lib/
    ├── escrow.ts             # Contract ABI + addresses
    └── chain.ts              # Chain configuration
```

---

## Key Files Explained

### `/app/api/cases/route.ts`
- **GET** - Fetches cases from database (filtered by wallet)
- **POST** - Creates a new case after contract creation

### `/app/api/cases/[id]/sync/route.ts`
- **POST** - Syncs a single case from blockchain → database
- Called after contract writes (submit, accept, dispute)

### `/app/api/resolve/route.ts`
- **POST** - Runs AI arbitration
- Fetches case from chain → sends to OpenAI → calls `resolve()` on contract

### `/db/schema.ts`
Database tables:
- `cases` - Main case data (title, description, status, etc.)
- `deliverables` - Uploaded files for each case
- `artifacts` - Required artifact definitions

---

## How Data Flows

### Creating a Case
```
1. User fills form
2. wagmi writes to contract → Transaction sent
3. Transaction confirmed → Parse CaseCreated event for caseId
4. POST /api/cases → Save title, description to database
5. Specs text uploaded to Vercel Blob
6. Navigate to new case
```

### Submitting Deliverables
```
1. User uploads files + description
2. Files uploaded to Vercel Blob → saved in deliverables table
3. wagmi calls submitDeliverable() on contract
4. Transaction confirmed → POST /api/cases/[id]/sync
5. Database updated with new status
```

### AI Arbitration
```
1. User clicks "Start AI Arbitration"
2. POST /api/resolve with caseId
3. API reads case from blockchain
4. OpenAI evaluates specs vs deliverables
5. AI response streams to frontend
6. API calls resolve() on contract (using AI judge wallet)
7. Funds transfer to winner
8. Database synced with new status
```

---

## Environment Variables

These are set in `.env.local` (auto-copied from parent's `.env.hardhat`):

```bash
# Chain connection
NEXT_PUBLIC_CHAIN=hardhat
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545

# Contract addresses
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_AI_JUDGE_ADDRESS=0x...

# AI Judge private key (server-side only)
AI_JUDGE_PRIVATE_KEY=0x...

# External services
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

---

## Database Schema

```sql
-- Cases table
cases:
  - id                  (auto)
  - caseIdOnChain       (unique, from contract)
  - payerAddress
  - payeeAddress
  - judgeAddress
  - title
  - description
  - amountEth
  - status              (Funded/Submitted/Disputed/Resolved)
  - specsHash
  - specsBlobUrl
  - deliverablesHash
  - deliverablesBlobUrl
  - aiWinner
  - aiRationale
  - timestamps...

-- Deliverables table  
deliverables:
  - id                  (auto)
  - caseId              (foreign key)
  - fileName
  - fileType
  - blobUrl
  - fileSizeBytes
  - uploadedBy
  - uploadedAt

-- Artifacts table (future)
artifacts:
  - id                  (auto)
  - caseId              (foreign key)
  - name
  - description
  - required
```

---

## Troubleshooting

### "Failed to fetch cases"
- Is the database connected? Check `DATABASE_URL` in `.env.local`
- Run `npm run db:seed` to populate test data

### "Contract returned no data"
- Hardhat node was restarted
- Run `make seed` from parent folder to redeploy

### AI arbitration not working
- Check `OPENAI_API_KEY` is set
- Case must be in "Disputed" status ON-CHAIN (not just in database)
- Check the case exists: `make seed` creates cases 0-6

### Files not uploading
- Check `BLOB_READ_WRITE_TOKEN` is set
- Vercel Blob requires a valid token from your Vercel project
