"use client";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "../lib/escrow";

const L = ["payer", "payee", "amount", "specs", "deliverables", "reviewDeadline", "status"];
const STATUS = ["Funded", "Submitted", "Disputed", "Resolved"];

export function CaseCard({ caseId, raw, onAction }: { caseId: number; raw: readonly unknown[]; onAction?: () => void }) {
  const { address } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const payer = raw[0] as string;
  const status = Number(raw[6] ?? 0);
  const isPayer = address?.toLowerCase() === payer?.toLowerCase();
  const canAcceptOrDispute = isPayer && status === 1; // Submitted

  const handleAccept = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "accept",
      args: [BigInt(caseId)],
    });
  };

  const handleDispute = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "openDispute",
      args: [BigInt(caseId)],
    });
  };

  // Trigger refresh after success
  if (isSuccess && onAction) onAction();

  return (
    <div className="border p-3 rounded">
      <b>#{caseId}</b>
      {L.map((l, i) => (
        <div key={l} className="text-sm">
          {l}: {l === "status" ? STATUS[Number(raw[i])] ?? String(raw[i]) : String(raw[i] ?? "")}
        </div>
      ))}

      {canAcceptOrDispute && (
        <div className="flex gap-2 mt-3">
          <button
            className="bg-green-500 text-white px-3 py-1 rounded text-sm font-medium"
            onClick={handleAccept}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? "..." : "Accept"}
          </button>
          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-sm font-medium"
            onClick={handleDispute}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? "..." : "Dispute"}
          </button>
        </div>
      )}
    </div>
  );
}