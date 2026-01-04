"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, textToBytes32Hash } from "../lib/escrow";

// Struct order: payer, payee, judge, amount, specs, deliverables, reviewDeadline, status
const L = ["payer", "payee", "judge", "amount", "specs", "deliverables", "reviewDeadline", "status"];
const STATUS = ["Funded", "Submitted", "Disputed", "Resolved"];

export function CaseCard({ caseId, raw, onAction }: { caseId: number; raw: readonly unknown[]; onAction?: () => void }) {
  const { address } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [deliverableText, setDeliverableText] = useState("");
  const [aiResolving, setAiResolving] = useState(false);
  const [aiResult, setAiResult] = useState<{ winner: string; rationale: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const payer = raw[0] as string;
  const payee = raw[1] as string;
  const status = Number(raw[7] ?? 0); // status is now at index 7

  const isPayer = address?.toLowerCase() === payer?.toLowerCase();
  const isPayee = address?.toLowerCase() === payee?.toLowerCase();

  const canAcceptOrDispute = isPayer && status === 1; // Submitted
  const canSubmitDeliverable = isPayee && status === 0; // Funded
  const canResolveWithAI = status === 2; // Disputed

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

  const handleSubmitDeliverable = () => {
    if (!deliverableText) return alert("Enter deliverable description");
    const reviewWindow = BigInt(7 * 24 * 60 * 60); // 7 days in seconds
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "submitDeliverable",
      args: [BigInt(caseId), textToBytes32Hash(deliverableText), reviewWindow],
    });
  };

  const handleResolveWithAI = async () => {
    setAiResolving(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch(`/api/resolve?caseId=${caseId}`);
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "AI resolution failed");
      } else {
        setAiResult({ winner: data.winner, rationale: data.rationale });
        if (onAction) onAction(); // Refresh case data
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAiResolving(false);
    }
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

      {canSubmitDeliverable && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            className="bg-gray-100 p-2 rounded text-sm"
            placeholder="Describe your deliverable..."
            value={deliverableText}
            onChange={(e) => setDeliverableText(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium"
            onClick={handleSubmitDeliverable}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? "..." : "Submit Deliverable"}
          </button>
        </div>
      )}

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

      {canResolveWithAI && (
        <div className="mt-3">
          <button
            className="bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium w-full"
            onClick={handleResolveWithAI}
            disabled={aiResolving}
          >
            {aiResolving ? "🤖 AI is reviewing..." : "🤖 Resolve with AI"}
          </button>
          {aiResult && (
            <div className="mt-2 p-2 bg-green-100 rounded text-sm">
              <div className="font-medium">Winner: {aiResult.winner}</div>
              <div className="text-gray-600">{aiResult.rationale}</div>
            </div>
          )}
          {aiError && (
            <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
              {aiError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}