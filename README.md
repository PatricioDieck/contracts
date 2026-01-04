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

## Run Locally

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- OpenAI API key

### Step 1: Start blockchain
```bash
npx hardhat node
```

### Step 2: Deploy contract
```bash
npm run seed
```
Copy the printed contract address.

### Step 3: Configure environment
Create `ui/.env.local`:
```bash
NEXT_PUBLIC_ESCROW_ADDRESS=0x...      # From step 2
NEXT_PUBLIC_AI_JUDGE_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Server-side only (not NEXT_PUBLIC_)
AI_JUDGE_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
OPENAI_API_KEY=sk-...
```

Note: The AI judge address/key above is Hardhat Account #1 (for local dev only).

### Step 4: Run UI
```bash
cd ui && npm run dev
```

Open http://localhost:3000

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

```bash
npm run node    # Start local blockchain
npm run deploy  # Deploy contract only
npm run seed    # Deploy + create test cases
```

---

## Tech Stack

- **Contract**: Solidity, Hardhat, OpenZeppelin
- **Frontend**: Next.js 16, React 19, Tailwind, wagmi, RainbowKit
- **AI**: OpenAI GPT-4o-mini
- **Chain**: Ethereum-compatible (Hardhat local, Base, Arbitrum for prod)
