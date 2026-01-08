import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const signers = await ethers.getSigners();

  // Account 0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (your MetaMask account)
  // Account 1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (AI Judge)
  const YOU = 0;        // Your account (payer for demo cases)
  const AI_JUDGE = 1;   // AI Judge account
  
  console.log("\n🔑 Account Info:");
  console.log(`   Your account (payer): ${signers[YOU].address}`);
  console.log(`   AI Judge:             ${signers[AI_JUDGE].address}`);

  // Deploy contract
  console.log("\n📦 Deploying EscrowV01...");
  const Escrow = await ethers.deployContract("EscrowV01");
  await Escrow.waitForDeployment();
  const escrowAddress = await Escrow.getAddress();
  console.log(`   Contract deployed to: ${escrowAddress}`);

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
    console.log(`   Case #${caseId}: ${payer.address.slice(0,10)}... → ${payee.address.slice(0,10)}... | ${amountEth} ETH | "${specs}"`);
    return caseId;
  };

  // Helper to submit deliverable
  const submitDeliverable = async (caseId: bigint, payeeIdx: number, deliverable: string) => {
    const payee = signers[payeeIdx];
    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes(deliverable));
    const tx = await Escrow.connect(payee).submitDeliverable(caseId, deliverableHash, 86400n * 7n); // 7 days
    await tx.wait();
    console.log(`            → Deliverable submitted: "${deliverable}"`);
  };

  console.log("\n📝 Creating demo cases (YOU = payer = 0xf39...):\n");

  // ============================================
  // DEMO CASES: You (0xf39) are the PAYER
  // These are in "Submitted" status - ready for you to Accept or Dispute
  // ============================================

  // Case 0: Website project - SUBMITTED (you can Accept or Dispute)
  const case0 = await createCase(YOU, 2, "1.5", "Build a responsive landing page with hero, features, and contact form");
  await submitDeliverable(case0, 2, "Landing page complete with all sections, mobile responsive, form connected to backend");

  // Case 1: Logo design - SUBMITTED (you can Accept or Dispute)
  const case1 = await createCase(YOU, 3, "0.5", "Design a modern logo for tech startup, 3 variations, source files included");
  await submitDeliverable(case1, 3, "3 logo variations delivered in SVG, PNG, and AI formats");

  // Case 2: Smart contract work - FUNDED (waiting for payee to deliver)
  await createCase(YOU, 4, "2.0", "Develop and audit an ERC-20 token contract");

  console.log("\n" + "=".repeat(60));
  console.log("✅ SEEDING COMPLETE!");
  console.log("=".repeat(60));
  
  console.log("\n📋 Update your ui/.env.local with:\n");
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`NEXT_PUBLIC_AI_JUDGE_ADDRESS=${signers[AI_JUDGE].address}`);
  console.log(`AI_JUDGE_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`);
  
  console.log("\n📊 Cases Summary:");
  console.log("   Case #0: SUBMITTED ← You can Accept or Dispute this!");
  console.log("   Case #1: SUBMITTED ← You can Accept or Dispute this!");
  console.log("   Case #2: FUNDED    ← Waiting for deliverable");
  
  console.log("\n🎬 Demo Flow:");
  console.log("   1. Open http://localhost:3000");
  console.log("   2. Connect MetaMask with account 0xf39...");
  console.log("   3. See Cases #0 and #1 with Accept/Dispute buttons");
  console.log("   4. Click 'Dispute' → Watch AI stream its decision!");
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
