[7 tools called]

---

# 🔐 Security Audit Report

## Executive Summary

Your codebase is reasonably well-structured for an MVP. The smart contract follows good patterns (CEI, ReentrancyGuard). However, there are several **critical**, **high**, and **medium** priority items to address before production.

---

## 🚨 CRITICAL (Fix Before Production)

### 1. **API Route Has No Authentication or Rate Limiting**

**File:** `ui/app/api/resolve/route.ts`

**Issue:** Anyone can call `/api/resolve` with any `caseId`. While the contract enforces that only disputed cases can be resolved, a malicious actor could:
- Spam your API with requests, burning your OpenAI credits
- DoS your AI judge wallet by draining its gas funds
- Potentially front-run legitimate resolution requests

**Fix:** Add request validation:

```typescript
// At the top of POST handler, add origin/referer check and rate limiting
export async function POST(request: NextRequest) {
  // Basic origin check (not foolproof, but raises the bar)
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    "https://your-production-domain.com",
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
  ].filter(Boolean);
  
  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  
  // ... rest of handler
}
```

For production, consider:
- **Upstash rate limiting** (free tier works)
- **Signature verification** (require user to sign a message proving they're the payer)

---

### 2. **AI Judge Private Key in Environment Variables**

**Issue:** The `AI_JUDGE_PRIVATE_KEY` is stored in `.env.local`. If your Vercel/hosting logs ever leak, or if someone gains access to your deployment, they can:
- Drain the AI judge wallet
- Resolve disputes however they want

**Current Risk Level:** Medium for testnet, **CRITICAL for mainnet**

**Fix Options (ranked by security):**

| Option | Complexity | Security |
|--------|-----------|----------|
| Environment variables (current) | Low | ⚠️ Adequate for testnet |
| AWS Secrets Manager / Vercel Secrets | Medium | ✅ Good for production |
| Hardware Security Module (HSM) | High | ✅✅ Best for high-value |
| Multi-sig for judge | High | ✅✅ Decentralized control |

**Recommended for MVP:** Use Vercel's encrypted environment variables (already better than `.env` files), and keep the AI judge wallet with minimal funds (~0.5 ETH max).

---

### 3. **No Slippage Protection / Replay Protection on AI Resolution**

**Issue:** If the AI streaming fails midway, or the contract call fails after the AI decision, the case is left in a limbo state (Disputed but no on-chain resolution). The current code has no retry mechanism or idempotency.

**File:** `ui/app/api/resolve/route.ts` lines 86-112

**Fix:** Add transaction retry and error handling:

```typescript
async onFinish({ text }) {
  // ... winner logic ...
  
  const MAX_RETRIES = 3;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const walletClient = getWalletClient();
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: "resolve",
        args: [caseId, winner, rationaleHash],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Case ${caseId} resolved on attempt ${i + 1}`);
      return; // Success, exit
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err);
      if (i === MAX_RETRIES - 1) {
        // Log to monitoring service (Sentry, etc.)
        // Consider a manual fallback queue
      }
    }
  }
}
```

---

## ⚠️ HIGH PRIORITY

### 4. **Smart Contract Not Verified on Etherscan**

**Issue:** Users can't verify your contract source code matches the bytecode. This is a trust issue.

**Fix:** After deploying to Sepolia/mainnet:

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

---

### 5. **No Emergency Pause Mechanism**

**Issue:** If a bug is discovered, there's no way to pause the contract.

**File:** `contracts/Contract.sol`

**Recommended:** Add OpenZeppelin's `Pausable`:

```solidity
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract EscrowV01 is ReentrancyGuard, Pausable {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Add whenNotPaused to critical functions
    function createCase(...) external payable whenNotPaused returns (uint256) {
        // ...
    }
}
```

---

### 6. **No Input Validation on Frontend**

**File:** `ui/app/page.tsx` line 68

**Issue:** The payee address is cast directly without validation:

```typescript
args: [payee as `0x${string}`, ...]
```

If user enters invalid address, the transaction will fail on-chain (wasting gas).

**Fix:** Validate before sending:

```typescript
import { isAddress } from "viem";

const onCreate = () => {
  if (!payee || !isAddress(payee)) return alert("Invalid payee address");
  if (!specText) return alert("Specs required");
  if (!amountEth || isNaN(parseFloat(amountEth)) || parseFloat(amountEth) <= 0) {
    return alert("Invalid amount");
  }
  // ... proceed
};
```

---

## 📋 MEDIUM PRIORITY

### 7. **Console Logs in Production**

**Issue:** `console.log` and `console.error` statements expose internal state.

**Files:** 
- `ui/app/api/resolve/route.ts` (3 occurrences)
- `ui/components/CaseCard.tsx` (1 occurrence)

**Fix:** Use a proper logger that's disabled in production, or wrap in environment check:

```typescript
if (process.env.NODE_ENV === "development") {
  console.log(...);
}
```

---

### 8. **Hardcoded Review Window**

**File:** `ui/components/CaseCard.tsx` line 106

```typescript
args: [BigInt(caseId), textToBytes32Hash(deliverableText), BigInt(7 * 24 * 60 * 60)]
```

The 7-day review window is hardcoded. Consider making this configurable.

---

### 9. **No Monitoring or Alerting**

**Issue:** If the AI judge wallet runs out of gas, or OpenAI API fails, you won't know until users complain.

**Recommended:**
- Add Sentry for error tracking
- Monitor AI judge wallet balance
- Set up alerts for failed transactions

---

### 10. **Contract Has No Upgrade Path**

**Issue:** If you find a bug, you can't upgrade the contract. All existing cases would be stuck.

**Options:**
- Accept this for MVP (simpler)
- Use OpenZeppelin's upgradeable proxy pattern (complex)
- Add a migration function that lets you move cases to a new contract (medium)

---

## ✅ GOOD PRACTICES ALREADY IN PLACE

| Practice | Status |
|----------|--------|
| ReentrancyGuard on fund transfers | ✅ |
| CEI pattern (Checks-Effects-Interactions) | ✅ |
| `.env` files gitignored | ✅ |
| `NEXT_PUBLIC_` prefix for client vars | ✅ |
| Private key not exposed to client | ✅ |
| Status checks before state changes | ✅ |
| Amount zeroed before transfer | ✅ |

---

## 🎯 Priority Action Items

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🚨 1 | Add rate limiting to `/api/resolve` | 1 hour | Prevents API abuse |
| 🚨 2 | Add origin check to `/api/resolve` | 15 min | Basic security |
| 🚨 3 | Add retry logic for on-chain resolution | 30 min | Prevents stuck cases |
| ⚠️ 4 | Verify contract on Etherscan | 5 min | User trust |
| ⚠️ 5 | Add address validation on frontend | 15 min | Better UX |
| ⚠️ 6 | Add Pausable to contract | 30 min | Emergency stop |

---

Would you like me to implement any of these fixes? Switch to **Agent mode** and let me know which ones to tackle first!