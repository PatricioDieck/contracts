import { NextRequest } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia, mainnet } from "viem/chains";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/db/db";
import { cases } from "@/db/schema";
import { eq } from "drizzle-orm";

import EscrowArtifact from "../../../../artifacts/contracts/Contract.sol/EscrowV01.json";

const ESCROW_ABI = EscrowArtifact.abi;

// Lazy getters - only called at runtime, not build time
const chains = { hardhat, sepolia, mainnet };

function getChain() {
  const name = process.env.NEXT_PUBLIC_CHAIN as keyof typeof chains;
  return chains[name];
}

function getPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });
}

function getWalletClient() {
  const key = process.env.AI_JUDGE_PRIVATE_KEY as `0x${string}`;
  if (!key) throw new Error("AI_JUDGE_PRIVATE_KEY not set");
  return createWalletClient({
    account: privateKeyToAccount(key),
    chain: getChain(),
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
  });
}

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  
  const caseIdMatch = prompt.match(/caseId:(\d+)/);
  if (!caseIdMatch) {
    return new Response(JSON.stringify({ error: "caseId required" }), { status: 400 });
  }
  
  const caseId = BigInt(caseIdMatch[1]);
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;
  const publicClient = getPublicClient();

  const caseData = await publicClient.readContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: "cases",
    args: [caseId],
  }) as readonly unknown[];

  const payer = caseData[0] as `0x${string}`;
  const payee = caseData[1] as `0x${string}`;
  const specs = caseData[4] as `0x${string}`;
  const deliverables = caseData[5] as `0x${string}`;
  const status = Number(caseData[7]);

  if (status !== 2) {
    return new Response(JSON.stringify({ error: "Case not in Disputed status" }), { status: 400 });
  }

  const aiPrompt = `You are an AI arbitrator for a smart contract dispute. Analyze this case and provide your reasoning, then declare a winner. THIS IS MOCK DATA- PRETEND YOU RECIEVED A FULL CASE FILE!!!

CONTRACT DETAILS:
- Case ID: ${caseId}
- Specifications hash: ${specs}
- Deliverables hash: ${deliverables}

INSTRUCTIONS:
1. First, explain your analysis of whether the deliverables meet the specifications (2-3 sentences)
2. Then, state any concerns or observations
3. Finally, declare the winner by writing exactly one of these on its own line:
   DECISION: PAYEE WINS
   or
   DECISION: PAYER WINS

Be concise but thoughtful. Your decision is final and binding.`;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    prompt: aiPrompt,
    async onFinish({ text }) {
      const payeeWins = text.includes("DECISION: PAYEE WINS");
      const payerWins = text.includes("DECISION: PAYER WINS");
      
      if (!payeeWins && !payerWins) {
        console.error("Could not determine winner from AI response");
        return;
      }

      const winner = payeeWins ? payee : payer;
      const rationaleHash = keccak256(toBytes(text.slice(0, 100)));

      try {
        const walletClient = getWalletClient();
        const hash = await walletClient.writeContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: "resolve",
          args: [caseId, winner, rationaleHash],
        });
        
        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`Case ${caseId} resolved. Winner: ${payeeWins ? "payee" : "payer"}, tx: ${hash}`);

        // Update database with AI rationale and result
        try {
          await db.update(cases)
            .set({
              status: 'Resolved',
              aiWinner: payeeWins ? 'Payee' : 'Payer',
              aiRationale: text,
              aiRationaleHash: rationaleHash,
              resolvedAt: new Date(),
            })
            .where(eq(cases.caseIdOnChain, Number(caseId)));
          console.log(`Database updated for case ${caseId}`);
        } catch (dbErr) {
          console.error("Failed to update database:", dbErr);
        }
      } catch (err) {
        console.error("Failed to resolve:", err);
      }
    },
  });

  return result.toTextStreamResponse();
}
