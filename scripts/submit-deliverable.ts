import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  const escrow = await ethers.getContractAt("EscrowV01", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const nextId = await escrow.nextCaseId();
  console.log("Total cases:", nextId.toString());

  // Find a case that's still Funded (status = 0)
  for (let i = 0; i < nextId; i++) {
    const c = await escrow.cases(i);
    console.log(`Case ${i}: payer=${c.payer}, payee=${c.payee}, status=${c.status}`);
    
    if (c.status === 0n) {
      console.log(`\nSubmitting deliverable for case ${i}...`);
      
      // Get the payee signer
      const signers = await ethers.getSigners();
      const payeeSigner = signers.find(s => s.address.toLowerCase() === c.payee.toLowerCase());
      
      if (!payeeSigner) {
        console.log("Payee not in local signers, trying signer[1]");
        const fallbackSigner = signers[1];
        // If payee isn't a local account, this won't work - skip
        continue;
      }
      
      const payeeEscrow = escrow.connect(payeeSigner);
      const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("Work completed!"));
      
      const tx = await payeeEscrow.submitDeliverable(i, deliverableHash, 86400n);
      await tx.wait();
      
      console.log(`Case ${i} is now Submitted!`);
      break; // Only do one
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

