import { useReadContract, useReadContracts } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, parseCase, type Case } from "../lib/contract";

export function useCases() {
  const { data: nextCaseId, refetch: refetchCount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextCaseId",
  });

  const count = Number(nextCaseId ?? 0n);

  const { data: casesData, refetch: refetchCases } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cases" as const,
      args: [BigInt(i)],
    })),
    allowFailure: true,
  });

  const cases: Case[] = (casesData ?? [])
    .map((r, idx) => r?.status === "success" ? parseCase(idx, r.result as readonly unknown[]) : null)
    .filter((c): c is Case => c !== null);

  const refresh = () => {
    refetchCount();
    refetchCases();
  };

  return { cases, count, refresh };
}
