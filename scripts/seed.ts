import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const signers = await ethers.getSigners();

  // Deploy contract
  console.log("Deploying EscrowV01...");
  const Escrow = await ethers.deployContract("EscrowV01");
  await Escrow.waitForDeployment();
  const escrowAddress = await Escrow.getAddress();
  console.log("EscrowV01 deployed to:", escrowAddress);

  // Helper to create a case
  const createCase = async (payerIdx: number, payeeIdx: number, amountEth: string, specs: string, judgeIdx: number) => {
    const payer = signers[payerIdx];
    const payee = signers[payeeIdx];
    const judge = signers[judgeIdx];
    const specsHash = ethers.keccak256(ethers.toUtf8Bytes(specs));
    
    const tx = await Escrow.connect(payer).createCase(payee.address, specsHash, judge.address, {
      value: ethers.parseEther(amountEth),
    });
    await tx.wait();
    
    const caseId = (await Escrow.nextCaseId()) - 1n;
    console.log(`Created Case #${caseId}: payer=${payer.address.slice(0,8)}..., payee=${payee.address.slice(0,8)}..., amount=${amountEth} ETH`);
    return caseId;
  };

  // Helper to submit deliverable
  const submitDeliverable = async (caseId: bigint, payeeIdx: number, deliverable: string) => {
    const payee = signers[payeeIdx];
    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes(deliverable));
    const tx = await Escrow.connect(payee).submitDeliverable(caseId, deliverableHash, 86400n);
    await tx.wait();
    console.log(`Case #${caseId}: Deliverable submitted → status = Submitted`);
  };

  // Helper to accept
  const acceptCase = async (caseId: bigint, payerIdx: number) => {
    const payer = signers[payerIdx];
    const tx = await Escrow.connect(payer).accept(caseId);
    await tx.wait();
    console.log(`Case #${caseId}: Accepted → status = Resolved`);
  };

  // Helper to dispute
  const disputeCase = async (caseId: bigint, payerIdx: number) => {
    const payer = signers[payerIdx];
    const tx = await Escrow.connect(payer).openDispute(caseId);
    await tx.wait();
    console.log(`Case #${caseId}: Disputed → status = Disputed`);
  };

  console.log("\n--- Creating test cases ---\n");

  // Case 0: Funded (no deliverable yet)
  await createCase(0, 1, "0.5", "Build a landing page", 1);

  // Case 1: Submitted (waiting for payer review)
  const case1 = await createCase(0, 2, "1.0", "Design a logo", 1);
  await submitDeliverable(case1, 2, "Logo v1 delivered");

  // Case 2: Submitted (different payer/payee)
  const case2 = await createCase(1, 3, "0.25", "Write documentation", 1);
  await submitDeliverable(case2, 3, "Docs completed");

  // Case 3: Resolved (accepted)
  const case3 = await createCase(2, 4, "0.75", "API integration", 1);
  await submitDeliverable(case3, 4, "API working");
  await acceptCase(case3, 2);

  // Case 4: Disputed (waiting for AI resolution)
  const case4 = await createCase(3, 5, "2.0", "Smart contract audit", 1);
  await submitDeliverable(case4, 5, "Audit report submitted");
  await disputeCase(case4, 3);

  console.log("\n--- Seeding complete! ---");
  console.log(`Contract: ${escrowAddress}`);
  console.log("Cases created: 5");
  console.log("  - Case 0: Funded");
  console.log("  - Case 1: Submitted");
  console.log("  - Case 2: Submitted");
  console.log("  - Case 3: Resolved");
  console.log("  - Case 4: Disputed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

