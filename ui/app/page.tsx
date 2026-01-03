"use client"
import Image from "next/image";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { ESCROW_ABI, ESCROW_ADDRESS, textToBytes32Hash } from "../lib/escrow"; // adjust import if needed
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
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Read how many cases exist (ids are 0..nextCaseId-1)
  const {
    data: nextCaseId,
    refetch: refetchNextCaseId,
    isLoading: nextCaseIdLoading,
    error: nextCaseIdError,
  } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextCaseId",
  });

  const caseIds = useMemo(() => {
    const n = Number(nextCaseId ?? 0n);
    if (!Number.isFinite(n) || n <= 0) return [];
    return Array.from({ length: n }, (_, i) => BigInt(i));
  }, [nextCaseId]);

  const {
    data: casesData,
    refetch: refetchCases,
    isLoading: casesLoading,
    error: casesError,
  } = useReadContracts({
    contracts: caseIds.map((id) => ({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cases",
      args: [id],
    })),
    allowFailure: true,
  });


  const [payer, setPayer] = useState("0x...");
  const [payee, setPayee] = useState("");
  const [amountEth, setAmountEth] = useState(0);
  const [specText, setSpecText] = useState("");

  useEffect(() => {
    if (address) setPayer(address);
  }, [address]);

  const onCreate = async () => {
    if (!payee) return alert("Enter payee address");
    if (!specText) return alert("Enter specs");
    if (!amountEth || amountEth <= 0) return alert("Enter amount");

    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "createCase",
      args: [payee as `0x${string}`, textToBytes32Hash(specText)],
      value: parseEther(String(amountEth)),
    });
  };

  useEffect(() => {
    if (!isSuccess) return;
    // After a successful createCase tx, refresh list
    refetchNextCaseId();
    refetchCases();
  }, [isSuccess, refetchNextCaseId, refetchCases]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-row items-center justify-between gap-6 text-center w-full sm:text-left ">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          <ConnectButton />
        </div>
        <div className="flex flex-col mt-8 gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Baby Bitcoin
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Create Contract
          </p>

          <div className="w-full">
            <div className="w-full flex flex-row gap-4 justify-between mb-8 " style={{ minHeight: 280 }}>
              <div className="flex flex-col w-full gap-2 mb-0  justify-between">
                <label className="block font-medium text-gray-700 dark:text-zinc-300">
                  Payer Address (you)
                </label>
                <input className="bg-gray-100 p-2 text-gray-400 rounded-md" value={payer.slice(0, 6) + "..." + payer.slice(-4)} disabled placeholder="payer address (you)" />
                <label className="block  font-medium text-gray-700 dark:text-zinc-300">
                  Payee Address
                </label>
                <input className="bg-gray-100 w-full p-2 rounded-md" value={payee} onChange={(e) => setPayee(e.target.value as `0x${string}`)} placeholder="0x..." />
                <label className="block  font-medium text-gray-700 dark:text-zinc-300">
                  Amount in ETH
                </label>
                <input className="bg-gray-100 p-2 rounded-md" type="number" value={amountEth} onChange={(e) => setAmountEth(Number(e.target.value) as number)} placeholder="amount in ETH" />
              </div>

              <div className="w-full flex flex-col h-[280px]">
                <label className="block font-medium text-gray-700 dark:text-zinc-300 mb-2">
                  Specs of the Contract
                </label>
                <textarea
                  className="bg-gray-100 p-2 rounded-md w-full flex-1 resize-none"
                  placeholder="specs of the contract- terms, conditions, etc."
                  value={specText} onChange={(e) => setSpecText(e.target.value)}
                />
              </div>
            </div>
            <button
              className="bg-blue-500 text-white p-2 font-bold rounded-md"
              onClick={onCreate}
              disabled={isPending || isConfirming}
            >
              {isPending ? "Wallet..." : isConfirming ? "Confirming..." : "Create Contract"}
            </button>

            {error && <pre className="mt-4 text-red-500">{error.message}</pre>}

            <div className="mt-10 w-full">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Existing Cases
              </h2>

              {(nextCaseIdError || casesError) && (
                <pre className="mt-2 text-red-500 text-xs">
                  {String(nextCaseIdError ?? casesError)}
                </pre>
              )}

              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Total: {nextCaseIdLoading ? "..." : Number(nextCaseId ?? 0n)}
              </div>

              {casesLoading && caseIds.length > 0 && (
                <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Loading cases...
                </div>
              )}

              <div className="mt-4 flex gap-3 flex-col-reverse">
                {(casesData ?? []).map((r, idx) => {
                  console.log("case result", idx, r.result);
                  if (!r || r.status !== "success") return null;

                  return (
                    <CaseCard
                      key={idx}
                      caseId={idx}
                      raw={r.result as unknown as readonly unknown[] | Record<string, unknown>}
                    />
                  );
                })}
              </div>
            </div>
          </div>


        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

        </div>
      </main>
    </div>
  );
}
