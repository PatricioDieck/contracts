import EscrowArtifact from "../../artifacts/contracts/Contract.sol/EscrowV01.json";
import { keccak256, toBytes, type Abi } from "viem";

// Contract constants
export const ESCROW_ABI = EscrowArtifact.abi as Abi;
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;
export const AI_JUDGE_ADDRESS = process.env.NEXT_PUBLIC_AI_JUDGE_ADDRESS as `0x${string}`;

// Hash helper for bytes32 fields
export function textToBytes32Hash(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}

// =============================================================================
// Case Type - Single source of truth for case data shape
// =============================================================================

export type CaseStatus = 0 | 1 | 2 | 3;

export const STATUS_LABELS: Record<CaseStatus, string> = {
  0: "Funded",
  1: "Submitted",
  2: "Disputed",
  3: "Resolved",
};

export interface Case {
  id: number;
  payer: string;
  payee: string;
  judge: string;
  amount: bigint;
  specs: string;
  deliverables: string;
  reviewDeadline: bigint;
  status: CaseStatus;
}

/** Parse raw contract tuple into typed Case */
export function parseCase(id: number, raw: readonly unknown[]): Case {
  return {
    id,
    payer: raw[0] as string,
    payee: raw[1] as string,
    judge: raw[2] as string,
    amount: raw[3] as bigint,
    specs: raw[4] as string,
    deliverables: raw[5] as string,
    reviewDeadline: raw[6] as bigint,
    status: Number(raw[7]) as CaseStatus,
  };
}
