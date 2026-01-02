import { network } from "hardhat";
import { loadDotEnv } from "./_env.js";

await loadDotEnv();

const { ethers } = await network.connect();

async function main() {
  const [deployer] = await ethers.getSigners();
  const aiJudge =
    process.env.AI_JUDGE_ADDRESS && process.env.AI_JUDGE_ADDRESS.length > 0
      ? process.env.AI_JUDGE_ADDRESS
      : deployer.address;

  console.log("Deploying EscrowV01...");
  console.log("  deployer:", deployer.address);
  console.log("  aiJudge:", aiJudge);

  const escrow = await ethers.deployContract("EscrowV01", [aiJudge]);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("Deployed ✅");
  console.log("  ESCROW_ADDRESS=", escrowAddress);
}

await main();



