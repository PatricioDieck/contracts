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

  console.log("\n📝 Creating demo cases:\n");

  // Case 0: SUBMITTED
  const case0 = await createCase(YOU, 2, "1.5", "Build a responsive landing page with hero, features, and contact form");
  await submitDeliverable(case0, 2, "Landing page complete");

  // Case 1: SUBMITTED  
  const case1 = await createCase(YOU, 3, "0.5", "Design a modern logo for tech startup, 3 variations");
  await submitDeliverable(case1, 3, "3 logo variations delivered");

  // Case 2: FUNDED
  await createCase(YOU, 4, "2.0", "Develop and audit an ERC-20 token contract");

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
