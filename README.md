# Sample Hardhat 3 Beta Project (`mocha` and `ethers`)

This project showcases a Hardhat 3 Beta project using `mocha` for tests and the `ethers` library for Ethereum interactions.

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using `mocha` and ethers.js
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

## AI Judge (OpenAI arbitration) — MVP script

This repo includes a minimal “AI Judge” runner that:
- Watches for `DisputeOpened(caseId)` events
- Loads local evidence from `./evidence/case-<id>.json`
- Calls OpenAI to pick a winner (`payer` or `payee`)
- Hashes the rationale to `bytes32`, signs the EIP-712 verdict with the `aiJudge` key
- Submits `resolveDispute(...)` on-chain

### Prereqs

- The deployed `EscrowV01` contract address
- The `aiJudge` private key (must be funded for gas on that network)
- An OpenAI API key

### Environment variables

- Recommended: copy `env.example` to `.env` and fill it in.

- `ESCROW_ADDRESS`: deployed `EscrowV01` address
- `OPENAI_API_KEY`: OpenAI key used for arbitration
- `OPENAI_MODEL` (optional): defaults to `gpt-4o-mini`
- `EVIDENCE_DIR` (optional): defaults to `./evidence`
- `LOOKBACK_BLOCKS` (optional): defaults to `5000` (initial scan window)

### Evidence files (local MVP)

Create one file per disputed case:
- `evidence/case-0.json`
- `evidence/case-1.json`
- etc.

The script does **not** enforce a schema; it sends the JSON blob to the LLM. A reasonable shape:

```json
{
  "specText": "What was promised",
  "deliverablesText": "What was delivered (links, descriptions)",
  "payerClaim": "Why payer thinks it failed",
  "payeeClaim": "Why payee thinks it succeeded",
  "extraLinks": ["https://...", "https://..."]
}
```

### Run once (process current disputes and exit)

```shell
cp env.example .env

ESCROW_ADDRESS=0xYourEscrowAddress \
OPENAI_API_KEY=your_key \
npx hardhat run --network sepolia scripts/ai-judge.ts
```

### Run in watch mode

```shell
cp env.example .env

ESCROW_ADDRESS=0xYourEscrowAddress \
OPENAI_API_KEY=your_key \
npx hardhat run --network sepolia scripts/ai-judge.ts --watch --pollSeconds=5
```

### Deploy EscrowV01 (prints the escrow address)

Local hardhat (quick sanity deploy):

```shell
npx hardhat run scripts/deploy-escrow.ts
```

### Local end-to-end demo (deploy + dispute + OpenAI + resolve)

This runs everything against Hardhat’s in-memory local chain (no funded accounts needed).

```shell
cp env.example .env
# Fill OPENAI_API_KEY in .env

npx hardhat run scripts/local-demo.ts
```

Sepolia (requires `SEPOLIA_RPC_URL` + `SEPOLIA_PRIVATE_KEY` configured in Hardhat):

```shell
cp env.example .env
# Fill SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY in .env

npx hardhat run --network sepolia scripts/deploy-escrow.ts
```

### Notes / safety

- The script will refuse to run unless the **first signer** for the selected Hardhat network matches `escrow.aiJudge()`.
- For MVP, evidence is local. Later you can swap `loadEvidence()` to fetch from a hosted JSON endpoint.
