# BabyBitcoin

**AI-arbitrated escrow contracts.** When parties disagree, an AI judge resolves disputes instead of lawyers.

---

## How It Works (The Simple Version)

```
1. 💰 Payer creates a contract → puts money in escrow
2. 📦 Payee does the work → submits deliverables  
3. ✅ Payer reviews:
   - Happy? → Accepts → Money goes to payee
   - Unhappy? → Disputes → AI decides who wins
4. 🤖 AI reads the specs and deliverables → picks a winner
5. 💸 Money automatically goes to the winner
```

**That's it.** No lawyers, no waiting, no arguing.

---

## Quick Start (5 minutes)

### 1. Setup (one time)

```bash
# Clone and install
cd contracts
npm install
cd ui && npm install && cd ..

# Create your config file
cp env.example .env.hardhat
# Edit .env.hardhat → add your OpenAI API key
```

### 2. Start everything

```bash
# Terminal 1: Start the blockchain
make node

# Terminal 2: Deploy contracts + seed test data
make seed

# Terminal 3: Start the website  
cd ui && npm run dev
```

### 3. Open the app

1. Go to http://localhost:3000
2. Connect MetaMask (use Hardhat network, chain ID 31337)
3. Import test wallet: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

You'll see 7 test cases in different states ready to explore!

---

## What's Where

```
contracts/
├── contracts/           # Solidity smart contract
│   └── Contract.sol     # The escrow contract (EscrowV01)
├── scripts/             # Deployment & seeding scripts  
│   ├── deploy.ts        # Deploy contract only
│   └── seed.ts          # Deploy + create test cases
├── ui/                  # Next.js frontend
│   ├── app/             # Pages & API routes
│   ├── components/      # React components
│   ├── db/              # Database schema (Drizzle ORM)
│   └── scripts/         # Database seeding
├── Makefile             # All commands in one place
└── README.md            # You are here!
```

---

## The Two Data Stores

We store data in **two places**:

### 1. Blockchain (Source of Truth)
What the smart contract stores:
- Who's involved (payer, payee, AI judge addresses)
- How much money is escrowed
- Status (Funded → Submitted → Disputed → Resolved)
- Hashes of specs and deliverables

### 2. Database (Rich Metadata)
What PostgreSQL stores:
- Case titles and descriptions
- Full specs and deliverables (in Vercel Blob storage)
- AI's reasoning after resolution
- Timestamps for everything

**Why both?** The blockchain is expensive and public. We store the essentials on-chain (money, status, hashes) and the details off-chain (titles, descriptions, files).

```
┌─────────────────────────────────────────────────────────────┐
│                     When you CREATE a case                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Frontend → Smart Contract (on-chain)                      │
│              • Stores: payer, payee, amount, specsHash      │
│              • Returns: caseId                               │
│                    ↓                                         │
│   Frontend → Database API (off-chain)                       │
│              • Stores: title, description, full specs       │
│              • Links to: caseId                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Case Lifecycle

Each case goes through these states:

| Status | What's happening | Who can act |
|--------|-----------------|-------------|
| **Funded** | Money is locked, waiting for work | Payee submits deliverables |
| **Submitted** | Work is done, waiting for review | Payer accepts or disputes |
| **Disputed** | Payer unhappy, AI will decide | Click "Start AI Arbitration" |
| **Resolved** | Done! Money sent to winner | Nobody (case closed) |

---

## Test Cases (After `make seed`)

The seed script creates 7 cases so you can test every state:

| Case | Status | Description |
|------|--------|-------------|
| #0 | Funded | API Integration - waiting for deliverables |
| #1 | Funded | ERC-20 Token - waiting for deliverables |
| #2 | Submitted | Website Redesign - ready to accept/dispute |
| #3 | Submitted | Logo Design - ready to accept/dispute |
| #4 | Disputed | Security Audit - **click to test AI!** |
| #5 | Resolved | Mobile App Design - payee won |
| #6 | Resolved | Video Editing - payer won (refund) |

**To test AI resolution:** Open Case #4 and click "Start AI Arbitration"

---

## Commands

All commands run from the `contracts/` folder:

```bash
# Development
make dev            # Start local Hardhat + UI together
make dev-sepolia    # Run UI against Sepolia testnet
make dev-mainnet    # Run UI against Mainnet

make node           # Start Hardhat node only
make seed           # Deploy + seed test cases (local)

# Deployment
make deploy         # Deploy to local Hardhat
make deploy-sepolia # Deploy to Sepolia testnet
make deploy-mainnet # Deploy to Mainnet

make help           # Show all available commands

# Database (run from ui/ folder)
npm run db:seed     # Populate database with test cases
npm run db:sync     # Sync database from blockchain
npm run db:studio   # Open Drizzle Studio (see your data)
```

---

## Environment Setup

### The Problem
Switching networks (Hardhat → Sepolia → Mainnet) means changing RPC URLs, contract addresses, keys. Manual editing is error-prone.

### The Solution
Three env files, one per network. Commands auto-copy the right one to `ui/.env.local`.

```
contracts/
├── .env.hardhat    ← Local dev (gitignored)
├── .env.sepolia    ← Testnet (gitignored)
├── .env.mainnet    ← Production (gitignored)
├── env.example     ← Template (committed)
```

### One-Time Setup

```bash
cp env.example .env.hardhat
cp env.example .env.sepolia  
cp env.example .env.mainnet
```

Fill in each with that network's values. You never edit `ui/.env.local` directly—it's auto-generated.

### Required Variables

```bash
# For AI arbitration
OPENAI_API_KEY=sk-...

# For database (Neon/Supabase)
DATABASE_URL=postgresql://...

# For file uploads (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Auto-filled by make seed
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_AI_JUDGE_ADDRESS=0x...
AI_JUDGE_PRIVATE_KEY=0x...
```

---

## How AI Arbitration Works

When someone disputes a case:

```
1. User clicks "Start AI Arbitration"
       ↓
2. Frontend calls /api/resolve
       ↓
3. API reads case from blockchain
       ↓
4. API sends to OpenAI: "Did the deliverables meet the specs?"
       ↓
5. AI streams its reasoning (you see it live!)
       ↓
6. API calls contract.resolve(winner) using AI judge wallet
       ↓  
7. Smart contract sends money to winner
       ↓
8. Case status → Resolved
```

The AI judge is just a wallet that has permission to call `resolve()`. The private key is stored server-side, never exposed to the browser.

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Route  │────▶│   OpenAI    │
│  (Next.js)  │     │ /api/resolve│     │  (GPT-4o)   │
└─────────────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       └──────────▶│  Contract   │◀──── AI Judge wallet
                   │ (EscrowV01) │      calls resolve()
                   └─────────────┘
                         │
                         ▼
                   ┌─────────────┐
                   │  Database   │
                   │ (PostgreSQL)│
                   └─────────────┘
```

---

## MetaMask Setup (Local Dev)

1. **Add Hardhat network:**
   - Network Name: `Hardhat`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import a test account:**
   - Copy a private key from `npx hardhat node` output
   - In MetaMask: Account → Import Account → Paste key

---

## Contract Functions

| Function | Who | When |
|----------|-----|------|
| `createCase(payee, specs, judge)` | Payer | Create new escrow |
| `submitDeliverable(caseId, deliverables, reviewWindow)` | Payee | After funded |
| `accept(caseId)` | Payer | After deliverable submitted |
| `openDispute(caseId)` | Payer | After deliverable submitted |
| `resolve(caseId, winner, rationale)` | Judge only | After disputed |
| `autoResolve(caseId)` | Anyone | After review deadline passes |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contract | Solidity, Hardhat, OpenZeppelin |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Wallet | wagmi, RainbowKit |
| Database | PostgreSQL (Neon), Drizzle ORM |
| File Storage | Vercel Blob |
| AI | OpenAI GPT-4o-mini, Vercel AI SDK |

---

## Why Makefile?

Following Unix philosophy:
- **One entrypoint** - all commands from one directory
- **Self-documenting** - run `make help` to see options
- **No extra dependencies** - Make comes with macOS/Linux
- **Transparent** - you can read exactly what each command does

---

## Common Issues

### "Contract returned no data"
The Hardhat node was restarted. Run `make seed` again to redeploy.

### Cases not showing in sidebar
Make sure you're connected with the right wallet. Run `npm run db:seed` to populate the database.

### AI arbitration fails
1. Check your `OPENAI_API_KEY` is set in `.env.hardhat`
2. Make sure the case is in "Disputed" status on-chain (not just in DB)

---

## What We Built (Recent Changes)

1. **Database Layer** - PostgreSQL for storing rich case metadata
2. **Title & Description** - Cases now have human-readable names
3. **File Upload** - Upload deliverables to Vercel Blob storage  
4. **Sync System** - Database syncs with blockchain after contract writes
5. **Manual AI Trigger** - Click a button to start AI arbitration (no auto-run)
6. **Full Lifecycle Seed** - Test cases in all 4 states (Funded/Submitted/Disputed/Resolved)
7. **Auto-refresh after AI Resolution** - Frontend now syncs DB + refreshes after AI decides
8. **AI Rationale Storage** - AI's reasoning saved to database after resolution

---

## ✅ Testing Results (Jan 2026)

**All core features working:**

| Feature | Status | Notes |
|---------|--------|-------|
| Cases List (sidebar + table) | ✅ | Shows 7 cases with titles, amounts, status badges |
| Case Detail View | ✅ | Parties, timeline stepper, specs, deliverables |
| New Case Form | ✅ | All fields, validation, "Create Case" button |
| Payer Actions (Submitted) | ✅ | "Accept & Release Payment" / "Open Dispute" buttons |
| File Upload (Deliverables) | ✅ | Files stored in Vercel Blob, links work |
| Specs Storage | ✅ | "View full specifications →" link to blob |
| AI Arbitration Panel | ✅ | Manual trigger button, streaming display |
| Database Sync | ✅ | `/api/cases/[id]/sync` updates DB from chain |
| Resolve API | ✅ | `/api/resolve` calls contract + saves rationale |

**Known Issues (not blocking):**
- "Wrong network" warning if MetaMask isn't on Hardhat (chain ID 31337)
- RainbowKit warns about HTTP RPC (expects HTTPS) - cosmetic only

---

## Future Ideas

- [ ] IPFS for decentralized file storage
- [ ] Multi-chain support (Base, Arbitrum)
- [ ] Email notifications
- [ ] Evidence submission during disputes
- [ ] Partial payments / milestones
