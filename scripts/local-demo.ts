import { network } from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadDotEnv } from "./_env.js";

await loadDotEnv();

const { ethers } = await network.connect();

type Evidence = Record<string, unknown>;

async function loadEvidence(caseId: bigint): Promise<Evidence> {
  const evidenceDir = process.env.EVIDENCE_DIR ?? "./evidence";
  const fp = path.join(evidenceDir, `case-${caseId.toString()}.json`);
  const raw = await readFile(fp, "utf8");
  return JSON.parse(raw) as Evidence;
}

async function decideWithOpenAI(input: unknown): Promise<{
  winner: "payer" | "payee";
  rationale: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in .env");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const system = [
    "You are a neutral contract arbitrator.",
    "Decide who should receive escrow funds based on whether deliverables satisfy the specs, using the provided evidence.make the rationale explicit and explain why and how it was reached ",
    "Return ONLY valid JSON with exactly these keys: winner, rationale.",
    "winner MUST be either 'payer' or 'payee'.",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  console.log(data)
  console.log(data.choices?.[0]?.message)
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI response missing content");

  const parsed = JSON.parse(content) as { winner?: unknown; rationale?: unknown };
  if (parsed.winner !== "payer" && parsed.winner !== "payee") {
    throw new Error(`Invalid winner: ${String(parsed.winner)}`);
  }
  if (typeof parsed.rationale !== "string" || parsed.rationale.trim().length === 0) {
    throw new Error("Invalid rationale");
  }

  return { winner: parsed.winner, rationale: parsed.rationale.trim() };
}

async function main() {
  const [aiJudge, payer, payee] = await ethers.getSigners();

  console.log("Local demo: deploying EscrowV01...");
  const escrow = await ethers.deployContract("EscrowV01", [aiJudge.address]);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("  escrow:", escrowAddress);
  console.log("  aiJudge:", aiJudge.address);
  console.log("  payer:", payer.address);
  console.log("  payee:", payee.address);

  // On-chain pointers (bytes32). In production these would be hashes of hosted JSON / IPFS / etc.
  const specs = ethers.id("specs-local-demo");
  const deliverables = ethers.id("deliverables-local-demo");

  // Create case + submit deliverables + open dispute
  await escrow
    .connect(payer)
    .createCase(payee.address, specs, { value: ethers.parseEther("0.01") });
  const caseId = (await escrow.nextCaseId()) - 1n;

  await escrow.connect(payee).submitDeliverable(caseId, deliverables, 3600);
  await escrow.connect(payer).openDispute(caseId);

  const c = await escrow.cases(caseId);
  console.log("\nDispute opened for caseId=", caseId.toString());

  const evidence = await loadEvidence(0n); // reuse sample evidence file by default

  const decision = await decideWithOpenAI({
    caseId: caseId.toString(),
    payer: c.payer,
    payee: c.payee,
    specs: c.specs,
    deliverables: c.deliverables,
    evidence,
  });

  const winnerAddr = decision.winner === "payer" ? c.payer : c.payee;
  const rationaleHash = ethers.keccak256(ethers.toUtf8Bytes(decision.rationale));

  const { chainId } = await ethers.provider.getNetwork();
  const domain = {
    name: "BabyBitcoinEscrow",
    version: "1",
    chainId,
    verifyingContract: escrowAddress,
  } as const;

  const types: Record<string, Array<{ name: string; type: string }>> = {
    Resolve: [
      { name: "caseId", type: "uint256" },
      { name: "winner", type: "address" },
      { name: "rationale", type: "bytes32" },
      { name: "specs", type: "bytes32" },
      { name: "deliverables", type: "bytes32" },
    ],
  };

  const message = {
    caseId,
    winner: winnerAddr,
    rationale: rationaleHash,
    specs: c.specs,
    deliverables: c.deliverables,
  } as const;

  const signature = await aiJudge.signTypedData(domain, types, message);
  console.log(signature)

  console.log("\nAI decision:");
  console.log("  winner:", decision.winner, winnerAddr);
  console.log("  rationale:", decision.rationale);
  console.log("  rationaleHash:", rationaleHash);

  const tx = await escrow
    .connect(aiJudge)
    .resolveDispute(caseId, winnerAddr, rationaleHash, signature);
  await tx.wait();

  console.log("\nResolved ✅ tx:", tx.hash);
}

await main();


