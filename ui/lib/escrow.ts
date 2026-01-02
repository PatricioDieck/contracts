import EscrowArtifact from "../../artifacts/contracts/Contract.sol/EscrowV01.json";
import { keccak256, toBytes } from "viem";

export const ESCROW_ABI = EscrowArtifact.abi;
export const ESCROW_ADDRESS = process.env
  .NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;

// Your contract takes bytes32; for arbitrary-length text, store a hash.
export function textToBytes32Hash(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}
