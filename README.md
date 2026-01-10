# BabyBitcoin

**AI-arbitrated escrow contracts.** When parties disagree, AI resolves disputes instead of lawyers.

---

## The Flow

```
1. Payer creates contract (funds escrow + specs)
2. Payee submits deliverable
3. Payer either:
   - Accepts → funds go to payee
   - Disputes → AI resolves
4. AI evaluates specs vs deliverables → decides winner
5. Funds automatically transfer to winner
```

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
                   │   Hardhat   │
                   │   (local)   │
                   └─────────────┘
```

### AI Resolution Flow

1. User clicks "Dispute" → status = `Disputed`
2. Anyone clicks "Resolve with AI" button
3. Frontend calls `/api/resolve?caseId=X`
4. API route:
   - Fetches case data from chain (specs, deliverables)
   - Sends to OpenAI: "Did deliverables meet specs?"
   - Receives decision: `{ winner: "payer" | "payee", rationale: "..." }`
   - Calls `resolve(caseId, winner, rationale)` using AI judge wallet
5. Funds transfer to winner, status = `Resolved`

---

## Environment Configuration

### The Problem
Without this setup, switching between Hardhat (local), Sepolia (testnet), and Mainnet requires manually editing `.env.local` every time—swapping out RPC URLs, contract addresses, private keys, etc. This is error-prone and tedious.

### The Solution
We keep **3 separate env files**, one per network. Scripts automatically copy the right one before running.

```
contracts/
├── .env.hardhat    ← Your local dev config (gitignored)
├── .env.sepolia    ← Your testnet config (gitignored)
├── .env.mainnet    ← Your production config (gitignored)
├── env.example     ← Template for reference (committed)
```

### How It Works

When you run a command, it copies the right env file first:

| Command | Copies | Then runs |
|---------|--------|-----------|
| `npm run dev` | `.env.hardhat` → `ui/.env.local` | `next dev` |
| `npm run dev:sepolia` | `.env.sepolia` → `ui/.env.local` | `next dev` |
| `npm run deploy:sepolia` | `.env.sepolia` → `ui/.env.local` | hardhat deploy |

**You never manually edit `ui/.env.local`**—it's auto-generated.

### Setup (One Time)

1. Copy the template for each environment:
   ```bash
   cp env.example .env.hardhat
   cp env.example .env.sepolia
   cp env.example .env.mainnet
   ```

2. Fill in each file with that network's values:
   - `.env.hardhat`: Local Hardhat addresses, default test keys
   - `.env.sepolia`: Your Sepolia contract, Alchemy RPC, funded AI judge
   - `.env.mainnet`: Production addresses (when ready)

### Why This Tradeoff?

**Added complexity:** 3 env files instead of 1, scripts copy files before running.

**What you gain:** Switch networks with one command. No risk of wrong keys. Each network's config is isolated. Never lose settings when switching.

---

## Run Locally

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- OpenAI API key

### Quick Start
```bash
# Terminal 1: Start blockchain
npm run node

# Terminal 2: Deploy + seed test data
npm run seed

# Terminal 3: Start UI (auto-uses .env.hardhat)
cd ui && npm run dev
```

Open http://localhost:3000

### Run Against Sepolia (Testnet)
```bash
npm run deploy:sepolia              # Deploy contract
cd ui && npm run dev:sepolia        # Run UI against Sepolia
```

### Run Against Mainnet (Production)
```bash
npm run deploy:mainnet              # Deploy contract
cd ui && npm run dev:mainnet        # Run UI against Mainnet
```

---

## MetaMask Setup

1. Add network:
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

2. Import a test account (from `npx hardhat node` output)

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

## Future: Blob Storage for Specs/Deliverables

Currently, specs and deliverables are stored as bytes32 hashes. For production:

- Store actual documents (PDFs, images) in blob storage (S3, IPFS)
- Store content hash on-chain
- AI retrieves full documents from storage for evaluation

---

## Scripts

### Root (`/contracts`)
```bash
npm run node              # Start local Hardhat blockchain
npm run seed              # Deploy + seed test cases (hardhat)
npm run deploy            # Deploy only (hardhat)
npm run deploy:sepolia    # Deploy to Sepolia testnet
npm run deploy:mainnet    # Deploy to Mainnet
```

### UI (`/contracts/ui`)
```bash
npm run dev               # Run UI (hardhat)
npm run dev:sepolia       # Run UI (sepolia)
npm run dev:mainnet       # Run UI (mainnet)
npm run build:sepolia     # Build for Sepolia
npm run build:mainnet     # Build for Mainnet
```

---

## Tech Stack

- **Contract**: Solidity, Hardhat, OpenZeppelin
- **Frontend**: Next.js 16, React 19, Tailwind, wagmi, RainbowKit
- **AI**: OpenAI GPT-4o-mini
- **Chain**: Ethereum-compatible (Hardhat local, Base, Arbitrum for prod)
