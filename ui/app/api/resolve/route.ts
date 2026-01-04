import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import OpenAI from "openai";

// Import ABI from artifacts (server-side)
import EscrowArtifact from "../../../../artifacts/contracts/Contract.sol/EscrowV01.json";

const ESCROW_ABI = EscrowArtifact.abi;
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;
const AI_JUDGE_PRIVATE_KEY = process.env.AI_JUDGE_PRIVATE_KEY as `0x${string}`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Clients for reading/writing to chain
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

function getWalletClient() {
  if (!AI_JUDGE_PRIVATE_KEY) throw new Error("AI_JUDGE_PRIVATE_KEY not set");
  const account = privateKeyToAccount(AI_JUDGE_PRIVATE_KEY);
  return createWalletClient({
    account,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseIdParam = searchParams.get("caseId");

    if (!caseIdParam) {
      return NextResponse.json({ error: "caseId required" }, { status: 400 });
    }

    const caseId = BigInt(caseIdParam);

    // 1. Fetch case data from contract
    const caseData = await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cases",
      args: [caseId],
    }) as readonly unknown[];

    // Struct order: payer, payee, judge, amount, specs, deliverables, reviewDeadline, status
    const payer = caseData[0] as `0x${string}`;
    const payee = caseData[1] as `0x${string}`;
    const specs = caseData[4] as `0x${string}`;
    const deliverables = caseData[5] as `0x${string}`;
    const status = Number(caseData[7]);

    // Verify case is in Disputed status (2)
    if (status !== 2) {
      return NextResponse.json({ error: "Case is not in Disputed status" }, { status: 400 });
    }

    // 2. Call OpenAI to evaluate
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt = `You are an AI arbitrator for a smart contract dispute.

A payer created a contract with these specifications (stored as a hash):
Specs hash: ${specs}

The payee submitted deliverables (stored as a hash):
Deliverables hash: ${deliverables}

Based on the information available, you must decide:
1. Did the payee fulfill the contract requirements?
2. Who should receive the escrowed funds?

Respond with ONLY a JSON object in this exact format:
{
  "winner": "payer" or "payee",
  "rationale": "Brief explanation (max 100 chars)"
}

Note: Since you only have hashes, make a reasonable judgment. In a production system, the actual specs and deliverables would be provided.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
    console.log("AI response:", aiResponse);
    const winnerRole = aiResponse.winner as "payer" | "payee";
    const rationale = aiResponse.rationale as string;

    if (!winnerRole || !["payer", "payee"].includes(winnerRole)) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    const winner = winnerRole === "payer" ? payer : payee;
    const rationaleHash = keccak256(toBytes(rationale));

    // 3. Call resolve() on the contract
    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "resolve",
      args: [caseId, winner, rationaleHash],
    });

    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      caseId: caseIdParam,
      winner: winnerRole,
      winnerAddress: winner,
      rationale,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    });

  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

