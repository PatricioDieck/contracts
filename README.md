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

## Quick Start

```bash
# One-time setup
cp env.example .env.hardhat
# Edit .env.hardhat with your OpenAI key

# Start everything
make dev
```

That's it. Opens blockchain + UI at http://localhost:3000

---

## Commands

All commands run from `contracts/` directory:

```bash
make dev            # Start local Hardhat + UI
make dev-sepolia    # Run UI against Sepolia testnet
make dev-mainnet    # Run UI against Mainnet

make deploy         # Deploy to local Hardhat
make deploy-sepolia # Deploy to Sepolia
make deploy-mainnet # Deploy to Mainnet

make seed           # Deploy + seed test cases
make node           # Start Hardhat node only
make help           # Show all commands
```

---

## Environment Setup

### The Problem
Switching networks (Hardhat → Sepolia → Mainnet) means changing RPC URLs, contract addresses, keys. Manual editing is error-prone.

### The Solution
Three env files, one per network. Commands auto-copy the right one.

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

Fill in each with that network's values. You never touch `ui/.env.local` directly—it's auto-generated.

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
```

### AI Resolution Flow

1. User clicks "Dispute" → status = `Disputed`
2. Frontend calls `/api/resolve?caseId=X`
3. API route:
   - Fetches case data from chain
   - Sends to OpenAI: "Did deliverables meet specs?"
   - Calls `resolve(caseId, winner, rationale)` using AI judge wallet
4. Funds transfer to winner, status = `Resolved`

---

## MetaMask Setup (Local Dev)

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

## Why Makefile?

Following Unix philosophy:
- **One entrypoint** - all commands from one directory
- **Self-documenting** - run `make help` to see options
- **No extra dependencies** - Make comes with macOS/Linux
- **Transparent** - you can read exactly what each command does

---

## Future

- Blob storage for specs/deliverables (S3, IPFS)
- Multi-chain support (Base, Arbitrum)
- Dispute evidence submission

---

## Tech Stack

- **Contract**: Solidity, Hardhat, OpenZeppelin
- **Frontend**: Next.js 16, React 19, Tailwind, wagmi, RainbowKit
- **AI**: OpenAI GPT-4o-mini
- **Chain**: Ethereum-compatible
