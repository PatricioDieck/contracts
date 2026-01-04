# BabyBitcoin

AI-arbitrated escrow contracts.

---

## Run Locally (3 steps)

**Terminal 1** — Start blockchain:
```bash
npx hardhat node
```

**Terminal 2** — Deploy + seed:
```bash
npm run seed
```
Copy the printed address.

**Terminal 3** — Run UI:
```bash
# First: paste the contract address into ui/.env.local
cd ui && npm run dev
```

Open http://localhost:3000

---

## How it connects

```
.env.local          →  Frontend  →  Contract  →  Hardhat Node
(contract address)     (wagmi)      (EscrowV01)   (localhost:8545)
```

The frontend reads `NEXT_PUBLIC_ESCROW_ADDRESS` and uses wagmi to call that contract.

---

## MetaMask setup

- Network: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Import a private key from `npx hardhat node` output

---

## Scripts

```bash
npm run node    # start chain
npm run deploy  # deploy only
npm run seed    # deploy + 5 test cases
```
