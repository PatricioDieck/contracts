import { network } from "hardhat";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadDotEnv } from "./_env.js";

await loadDotEnv();

const { ethers } = await network.connect();

type Evidence = Record<string, unknown>;

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(prefix: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return undefined;
  const [, v] = hit.split("=", 2);
  return v;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadEvidence(caseId: bigint): Promise<Evidence> {
  const evidenceDir = process.env.EVIDENCE_DIR ?? "./evidence";
  const fp = path.join(evidenceDir, `case-${caseId.toString()}.json`);
  const raw = await readFile(fp, "utf8");
  return JSON.parse(raw) as Evidence;
}

async function decideWithOpenAI(input: {
  caseId: bigint;
  payer: string;
  payee: string;
  specs: string;
  deliverables: string;
  evidence: Evidence;
}): Promise<{ winner: "payer" | "payee"; rationale: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY (set it, or build a stub mode)");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const system = [
    "You are a neutral contract arbitrator.",
    "Decide who should receive escrow funds based on whether deliverables satisfy the specs, using the provided evidence.",
    "Return ONLY valid JSON with exactly these keys: winner, rationale.",
    "winner MUST be either 'payer' or 'payee'. rationale MUST be a short string.",
    "If evidence is insufficient, choose the fairest outcome and explain why.",
  ].join("\n");

  const user = JSON.stringify(input, null, 2);

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
        { role: "user", content: user },
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

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI response missing content");

  const parsed = JSON.parse(content) as {
    winner?: unknown;
    rationale?: unknown;
  };

  const winner = parsed.winner;
  const rationale = parsed.rationale;

  if (winner !== "payer" && winner !== "payee") {
    throw new Error(`Invalid winner from OpenAI: ${String(winner)}`);
  }
  if (typeof rationale !== "string" || rationale.trim().length === 0) {
    throw new Error("Invalid rationale from OpenAI");
  }

  return { winner, rationale: rationale.trim() };
}

async function main() {
  const escrowAddress = process.env.ESCROW_ADDRESS;
  if (!escrowAddress) {
    throw new Error("Missing ESCROW_ADDRESS env var");
  }

  const watch = argFlag("--watch");
  const pollSeconds = Number(argValue("--pollSeconds") ?? "5");
  const lookbackBlocks = Number(process.env.LOOKBACK_BLOCKS ?? "5000");

  const escrow = await ethers.getContractAt("EscrowV01", escrowAddress);
  const [signer] = await ethers.getSigners();

  const judgeOnChain = await escrow.aiJudge();
  if (judgeOnChain.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      `Signer mismatch. First signer is ${signer.address} but escrow.aiJudge() is ${judgeOnChain}. ` +
        "Make sure your network account/private key is the aiJudge address.",
    );
  }

  console.log("AI Judge online");
  console.log("  escrow:", escrowAddress);
  console.log("  aiJudge:", signer.address);
  console.log("  watch:", watch);

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

  const seen = new Set<string>();

  async function handleCase(caseId: bigint) {
    const key = caseId.toString();
    if (seen.has(key)) return;

    const c = await escrow.cases(caseId);
    // Status.Disputed == 2
    if (c.status !== 2n) return;

    console.log(`\nDispute detected: caseId=${caseId}`);

    let evidence: Evidence;
    try {
      evidence = await loadEvidence(caseId);
    } catch (e) {
      console.warn(
        `Skipping caseId=${caseId}: missing/invalid evidence file (expected ./evidence/case-${caseId}.json).`,
      );
      return;
    }

    const decision = await decideWithOpenAI({
      caseId,
      payer: c.payer,
      payee: c.payee,
      specs: c.specs,
      deliverables: c.deliverables,
      evidence,
    });

    const winnerAddr = decision.winner === "payer" ? c.payer : c.payee;
    const rationaleHash = ethers.keccak256(ethers.toUtf8Bytes(decision.rationale));

    const message = {
      caseId,
      winner: winnerAddr,
      rationale: rationaleHash,
      specs: c.specs,
      deliverables: c.deliverables,
    } as const;

    const signature = await signer.signTypedData(domain, types, message);

    console.log(`Decision: winner=${decision.winner} (${winnerAddr})`);
    console.log(`Rationale: ${decision.rationale}`);
    console.log(`Rationale hash (on-chain): ${rationaleHash}`);

    const tx = await escrow
      .connect(signer)
      .resolveDispute(caseId, winnerAddr, rationaleHash, signature);

    console.log("Submitting resolveDispute tx:", tx.hash);
    await tx.wait();
    console.log("Resolved ✅");

    seen.add(key);
  }

  const latest = await ethers.provider.getBlockNumber();
  let fromBlock = Math.max(0, latest - lookbackBlocks);

  async function pollOnce() {
    const toBlock = await ethers.provider.getBlockNumber();
    const events = await escrow.queryFilter(
      escrow.filters.DisputeOpened(),
      fromBlock,
      toBlock,
    );

    for (const ev of events) {
      const caseId = ev.args?.caseId as bigint | undefined;
      if (caseId === undefined) continue;
      await handleCase(caseId);
    }

    fromBlock = toBlock + 1;
  }

  await pollOnce();
  if (!watch) return;

  while (true) {
    try {
      await pollOnce();
    } catch (e) {
      console.error("poll error:", e);
    }
    await sleep(Math.max(1, pollSeconds) * 1000);
  }
}

await main();


