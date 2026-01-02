import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const Escrow = await ethers.deployContract("EscrowV01");
  await Escrow.waitForDeployment();

  console.log("EscrowV01 deployed to:", await Escrow.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});