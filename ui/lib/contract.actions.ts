import { parseEther } from "viem";
import { ESCROW_ABI, ESCROW_ADDRESS, AI_JUDGE_ADDRESS, textToBytes32Hash } from "./contract";

/** Create a new escrow case */
export function createCase(payee: string, specs: string, amountEth: string) {
  return {
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "createCase" as const,
    args: [payee as `0x${string}`, textToBytes32Hash(specs), AI_JUDGE_ADDRESS],
    value: parseEther(amountEth),
  };
}

/** Accept deliverable and release funds to payee */
export function acceptCase(caseId: number) {
  return {
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "accept" as const,
    args: [BigInt(caseId)],
  };
}

/** Open a dispute for AI arbitration */
export function openDispute(caseId: number) {
  return {
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "openDispute" as const,
    args: [BigInt(caseId)],
  };
}

/** Submit deliverable for payer review */
export function submitDeliverable(caseId: number, text: string) {
  return {
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "submitDeliverable" as const,
    args: [BigInt(caseId), textToBytes32Hash(text), BigInt(7 * 24 * 60 * 60)],
  };
}
