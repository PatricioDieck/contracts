"use client"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { ESCROW_ABI, ESCROW_ADDRESS, textToBytes32Hash } from "../lib/escrow";
import { CaseCard } from "../components/CaseCard";

/*
we are going to add the state 
1. create new 
2. view existing
  - dispute button

*/

/*
struct Case {
    address payer;
    address payee;
    uint256 amount;

    bytes32 specs;
    bytes32 deliverables;
    uint64 reviewDeadline;

    Status status;
}
*/

export default function Home() {
  const { address } = useAccount();
  const { data: txHash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: nextCaseId, refetch: refetchNextCaseId } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextCaseId",
  });

  const caseIds = useMemo(() => {
    const n = Number(nextCaseId ?? 0n);
    return n > 0 ? Array.from({ length: n }, (_, i) => BigInt(i)) : [];
  }, [nextCaseId]);

  const { data: casesData, refetch: refetchCases } = useReadContracts({
    contracts: caseIds.map((id) => ({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cases",
      args: [id],
    })),
    allowFailure: true,
  });

  const [payee, setPayee] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [specText, setSpecText] = useState("");

  const onCreate = () => {
    if (!payee || !specText || !amountEth) return alert("Fill all fields");
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createCase",
      args: [payee as `0x${string}`, textToBytes32Hash(specText)],
      value: parseEther(amountEth),
    });
  };

  useEffect(() => {
    if (isSuccess) { refetchNextCaseId(); refetchCases(); }
  }, [isSuccess, refetchNextCaseId, refetchCases]);

  const payer = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "not connected";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold dark:text-white">Baby Bitcoin</h1>
          <ConnectButton />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Create Contract</h2>
          <div className="flex gap-6 mb-4">
            <div className="flex flex-col gap-3 flex-1">
              <label className="text-sm font-medium dark:text-zinc-300">Payer (you)</label>
              <input className="bg-gray-100 p-2 rounded text-gray-500" value={payer} disabled />
              <label className="text-sm font-medium dark:text-zinc-300">Payee Address</label>
              <input className="bg-gray-100 p-2 rounded" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="0x..." />
              <label className="text-sm font-medium dark:text-zinc-300">Amount (ETH)</label>
              <input className="bg-gray-100 p-2 rounded" value={amountEth} onChange={(e) => setAmountEth(e.target.value)} placeholder="0.01" />
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-sm font-medium dark:text-zinc-300 mb-1">Specs</label>
              <textarea className="bg-gray-100 p-2 rounded flex-1 resize-none" value={specText} onChange={(e) => setSpecText(e.target.value)} placeholder="Contract terms..." />
            </div>
          </div>
          <button className="bg-blue-500 text-white p-2 rounded font-bold w-full" onClick={onCreate} disabled={isPending || isConfirming}>
            {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming..." : "Create Contract"}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error.message}</div>}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 dark:text-white">Cases ({Number(nextCaseId ?? 0n)})</h2>
          <div className="flex flex-col-reverse gap-3">
            {(casesData ?? []).map((r, idx) => (
              r?.status === "success" && <CaseCard 
              key={idx} 
              caseId={idx} 
              raw={r.result as readonly unknown[]} 
              onAction={() => { refetchNextCaseId(); refetchCases(); }}
            />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
