import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("EscrowV01 (EIP-712 arbitration)", function () {
  it("resolves a dispute with an aiJudge EIP-712 signature and pays the winner", async function () {
    const [payer, payee, aiJudge, relayer] = await ethers.getSigners();

    const escrow = await ethers.deployContract("EscrowV01", [aiJudge.address]);
    const escrowAddress = await escrow.getAddress();

    const specs = ethers.id("specs-v01");
    const deliverables = ethers.id("deliverables-v01");
    const rationale = ethers.id("rationale-v01");

    // create case (funded by payer)
    await escrow
      .connect(payer)
      .createCase(payee.address, specs, { value: ethers.parseEther("1") });
    const caseId = (await escrow.nextCaseId()) - 1n;

    // submit deliverables, open dispute
    await escrow.connect(payee).submitDeliverable(caseId, deliverables, 3600);
    await escrow.connect(payer).openDispute(caseId);

    // EIP-712 verdict signed by aiJudge
    const { chainId } = await ethers.provider.getNetwork();
    const domain = {
      name: "BabyBitcoinEscrow",
      version: "1",
      chainId,
      verifyingContract: escrowAddress,
    } as const;

    const types = {
      Resolve: [
        { name: "caseId", type: "uint256" },
        { name: "winner", type: "address" },
        { name: "rationale", type: "bytes32" },
        { name: "specs", type: "bytes32" },
        { name: "deliverables", type: "bytes32" },
      ],
    } as const;

    const message = {
      caseId,
      winner: payee.address,
      rationale,
      specs,
      deliverables,
    } as const;

    const signature = await aiJudge.signTypedData(domain, types, message);

    await expect(
      escrow
        .connect(relayer)
        .resolveDispute(caseId, payee.address, rationale, signature),
    )
      .to.emit(escrow, "Resolved")
      .withArgs(caseId, payee.address, rationale);

    // funds are no longer held by the escrow
    expect(await ethers.provider.getBalance(escrowAddress)).to.equal(0n);

    const c = await escrow.cases(caseId);
    // Status.Resolved == 3
    expect(c.status).to.equal(3n);
    expect(c.amount).to.equal(0n);
  });

  it("rejects a dispute resolution with a bad signature", async function () {
    const [payer, payee, aiJudge, attacker] = await ethers.getSigners();

    const escrow = await ethers.deployContract("EscrowV01", [aiJudge.address]);
    const escrowAddress = await escrow.getAddress();

    const specs = ethers.id("specs-badsig");
    const deliverables = ethers.id("deliverables-badsig");
    const rationale = ethers.id("rationale-badsig");

    await escrow
      .connect(payer)
      .createCase(payee.address, specs, { value: ethers.parseEther("1") });
    const caseId = (await escrow.nextCaseId()) - 1n;

    await escrow.connect(payee).submitDeliverable(caseId, deliverables, 3600);
    await escrow.connect(payer).openDispute(caseId);

    const { chainId } = await ethers.provider.getNetwork();
    const domain = {
      name: "BabyBitcoinEscrow",
      version: "1",
      chainId,
      verifyingContract: escrowAddress,
    } as const;

    const types = {
      Resolve: [
        { name: "caseId", type: "uint256" },
        { name: "winner", type: "address" },
        { name: "rationale", type: "bytes32" },
        { name: "specs", type: "bytes32" },
        { name: "deliverables", type: "bytes32" },
      ],
    } as const;

    const message = {
      caseId,
      winner: payee.address,
      rationale,
      specs,
      deliverables,
    } as const;

    // attacker signs, not aiJudge
    const signature = await attacker.signTypedData(domain, types, message);

    await expect(
      escrow
        .connect(attacker)
        .resolveDispute(caseId, payee.address, rationale, signature),
    ).to.be.revertedWith("bad signature");
  });
});



