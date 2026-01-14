import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardhat Account #1 private key (deterministic, same every time)
const AI_JUDGE_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function main() {
  const { ethers } = await network.connect();
  const signers = await ethers.getSigners();

  const YOU = 0;        // Your account (payer)
  const AI_JUDGE = 1;   // AI Judge account
  
  console.log("\n🔑 Accounts:");
  console.log(`   You:      ${signers[YOU].address}`);
  console.log(`   AI Judge: ${signers[AI_JUDGE].address}`);

  // Deploy contract
  console.log("\n📦 Deploying EscrowV01...");
  const Escrow = await ethers.deployContract("EscrowV01");
  await Escrow.waitForDeployment();
  const escrowAddress = await Escrow.getAddress();
  console.log(`   Deployed: ${escrowAddress}`);

  // Helper to create a case
  const createCase = async (payerIdx: number, payeeIdx: number, amountEth: string, specs: string) => {
    const payer = signers[payerIdx];
    const payee = signers[payeeIdx];
    const judge = signers[AI_JUDGE];
    const specsHash = ethers.keccak256(ethers.toUtf8Bytes(specs));
    
    const tx = await Escrow.connect(payer).createCase(payee.address, specsHash, judge.address, {
      value: ethers.parseEther(amountEth),
    });
    await tx.wait();
    
    const caseId = (await Escrow.nextCaseId()) - 1n;
    console.log(`   Case #${caseId}: ${amountEth} ETH | "${specs.slice(0, 40)}..."`);
    return caseId;
  };

  // Helper to submit deliverable
  const submitDeliverable = async (caseId: bigint, payeeIdx: number, deliverable: string) => {
    const payee = signers[payeeIdx];
    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes(deliverable));
    const tx = await Escrow.connect(payee).submitDeliverable(caseId, deliverableHash, 86400n * 7n);
    await tx.wait();
  };

  // Helper to open dispute
  const openDispute = async (caseId: bigint, payerIdx: number) => {
    const payer = signers[payerIdx];
    const tx = await Escrow.connect(payer).openDispute(caseId);
    await tx.wait();
  };

  // Helper to resolve dispute (as AI judge)
  const resolveDispute = async (caseId: bigint, winnerIdx: number) => {
    const judge = signers[AI_JUDGE];
    const winner = signers[winnerIdx];
    const rationaleHash = ethers.keccak256(ethers.toUtf8Bytes("AI determination"));
    const tx = await Escrow.connect(judge).resolve(caseId, winner.address, rationaleHash);
    await tx.wait();
  };

  console.log("\n📝 Creating demo cases in all stages:\n");

  // =========================================================================
  // FUNDED CASES (Case 0, 1) - Waiting for deliverables
  // =========================================================================
  console.log("   📦 FUNDED (waiting for deliverables):");
  await createCase(YOU, 2, "2.0", "API Integration Service - Build REST API with Stripe integration");
  await createCase(YOU, 4, "3.5", "ERC-20 Token Contract Development with minting and burning");

  // =========================================================================
  // SUBMITTED CASES (Case 2, 3) - Waiting for review
  // =========================================================================
  console.log("\n   📤 SUBMITTED (waiting for review):");
  const case2 = await createCase(YOU, 3, "1.5", "Website Redesign Project - responsive homepage with hero section");
  await submitDeliverable(case2, 3, "Website redesign complete with all requested sections");

  const case3 = await createCase(YOU, 2, "0.75", "Logo Design Package - 3 modern logo variations for tech startup");
  await submitDeliverable(case3, 2, "3 logo variations with SVG source files delivered");

  // =========================================================================
  // DISPUTED CASE (Case 4) - AI judge reviewing
  // =========================================================================
  console.log("\n   ⚖️  DISPUTED (AI judge reviewing):");
  const case4 = await createCase(3, YOU, "5.0", "Smart Contract Security Audit - Full DeFi protocol audit");
  await submitDeliverable(case4, YOU, "Security audit report submitted");
  await openDispute(case4, 3);
  console.log(`   Case #${case4}: Dispute opened - ready for AI arbitration`);

  // =========================================================================
  // RESOLVED CASES (Case 5, 6) - Completed
  // =========================================================================
  console.log("\n   ✅ RESOLVED (completed):");
  
  // Case 5: Payee wins
  const case5 = await createCase(YOU, 2, "3.8", "Mobile App UI/UX Design - Complete Figma designs and prototype");
  await submitDeliverable(case5, 2, "Full UI/UX deliverables with design system");
  await openDispute(case5, YOU);
  await resolveDispute(case5, 2); // Payee wins
  console.log(`   Case #${case5}: Resolved - Payee wins`);

  // Case 6: Payer wins
  const case6 = await createCase(YOU, 4, "0.5", "Video Editing Project - 60 second promotional video");
  await submitDeliverable(case6, 4, "45 second video (incomplete)");
  await openDispute(case6, YOU);
  await resolveDispute(case6, YOU); // Payer wins (refund)
  console.log(`   Case #${case6}: Resolved - Payer wins (refund)`);

  // =========================================================================
  // AUTO-UPDATE .env.hardhat
  // =========================================================================
  const envPath = path.join(__dirname, "..", ".env.hardhat");
  
  // Read existing file or start fresh
  let envContent = "";
  try {
    envContent = fs.readFileSync(envPath, "utf-8");
  } catch {
    // File doesn't exist, start with template
    envContent = fs.readFileSync(path.join(__dirname, "..", "env.example"), "utf-8");
  }

  // Update values (preserve other lines like OPENAI_API_KEY)
  const updates: Record<string, string> = {
    "NEXT_PUBLIC_CHAIN": "hardhat",
    "NEXT_PUBLIC_RPC_URL": "http://127.0.0.1:8545",
    "NEXT_PUBLIC_ESCROW_ADDRESS": escrowAddress,
    "NEXT_PUBLIC_AI_JUDGE_ADDRESS": signers[AI_JUDGE].address,
    "AI_JUDGE_PRIVATE_KEY": AI_JUDGE_PRIVATE_KEY,
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ Updated .env.hardhat with:");
  console.log(`   NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);

  // Also copy to ui/.env.local
  const uiEnvPath = path.join(__dirname, "..", "ui", ".env.local");
  fs.writeFileSync(uiEnvPath, envContent);
  console.log("   Copied to ui/.env.local");

  console.log("\n🎬 Ready! Run: cd ui && npm run dev");
  console.log("   Then open http://localhost:3000\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
