"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS, textToBytes32Hash } from "../lib/escrow";

// Struct order: payer, payee, judge, amount, specs, deliverables, reviewDeadline, status
const L = ["payer", "payee", "judge", "amount", "specs", "deliverables", "reviewDeadline", "status"];
const STATUS = ["Funded", "Submitted", "Disputed", "Resolved"];

export function CaseCard({ caseId, raw, onAction }: { caseId: number; raw: readonly unknown[]; onAction?: () => void }) {
  const { address } = useAccount();
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [deliverableText, setDeliverableText] = useState("");
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false);
  const [disputeTriggered, setDisputeTriggered] = useState(false);
  const [aiResolving, setAiResolving] = useState(false);
  const [aiResult, setAiResult] = useState<{ winner: string; rationale: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const hasTriggeredAI = useRef(false);

  const payer = raw[0] as string;
  const payee = raw[1] as string;
  const status = Number(raw[7] ?? 0);

  const isPayer = address?.toLowerCase() === payer?.toLowerCase();
  const isPayee = address?.toLowerCase() === payee?.toLowerCase();

  const canAcceptOrDispute = isPayer && status === 1;
  const canSubmitDeliverable = isPayee && status === 0;

  const triggerAIResolution = useCallback(async () => {
    setAiResolving(true);
    setAiError(null);
    setAiResult(null);
    
    // Small delay for dramatic effect
    await new Promise(r => setTimeout(r, 500));
    
    try {
      const res = await fetch(`/api/resolve?caseId=${caseId}`);
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "AI resolution failed");
      } else {
        setAiResult({ winner: data.winner, rationale: data.rationale });
        if (onAction) onAction();
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAiResolving(false);
      setDisputeTriggered(false);
      reset();
    }
  }, [caseId, onAction, reset]);

  // Auto-trigger AI resolution after dispute transaction confirms
  useEffect(() => {
    if (isSuccess && disputeTriggered && !hasTriggeredAI.current) {
      hasTriggeredAI.current = true;
      triggerAIResolution();
    }
  }, [isSuccess, disputeTriggered, triggerAIResolution]);

  const handleAccept = () => {
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "accept",
      args: [BigInt(caseId)],
    });
  };

  const handleDisputeClick = () => {
    setShowDisputeConfirm(true);
  };

  const handleDisputeConfirm = () => {
    setShowDisputeConfirm(false);
    setDisputeTriggered(true);
    hasTriggeredAI.current = false;
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "openDispute",
      args: [BigInt(caseId)],
    });
  };

  const handleSubmitDeliverable = () => {
    if (!deliverableText) return alert("Enter deliverable description");
    const reviewWindow = BigInt(7 * 24 * 60 * 60);
    writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "submitDeliverable",
      args: [BigInt(caseId), textToBytes32Hash(deliverableText), reviewWindow],
    });
  };

  // Refresh on non-dispute success
  useEffect(() => {
    if (isSuccess && !disputeTriggered && onAction) {
      onAction();
    }
  }, [isSuccess, disputeTriggered, onAction]);

  // AI Resolution in progress - show dramatic UI
  if (aiResolving) {
    return (
      <div className="border-2 border-purple-500 p-6 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🤖</div>
          <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2">
            AI Judge is Reviewing
          </h3>
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
            Analyzing contract specifications and deliverables...
          </p>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  // AI Resolution complete - show result
  if (aiResult) {
    const winnerIsPayee = aiResult.winner === "payee";
    return (
      <div className={`border-2 p-6 rounded-lg ${winnerIsPayee ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-orange-500 bg-orange-50 dark:bg-orange-950"}`}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{winnerIsPayee ? "✅" : "↩️"}</div>
          <h3 className="text-lg font-bold mb-1">
            Case #{caseId} Resolved
          </h3>
          <div className={`text-2xl font-bold ${winnerIsPayee ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"}`}>
            {winnerIsPayee ? "Payee Wins" : "Payer Wins"}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">AI Rationale</div>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">&ldquo;{aiResult.rationale}&rdquo;</p>
        </div>
        <div className="mt-4 text-center text-xs text-gray-500">
          Funds automatically transferred to winner
        </div>
      </div>
    );
  }

  return (
    <div className="border p-4 rounded-lg bg-white dark:bg-zinc-900">
      <div className="flex justify-between items-start mb-3">
        <b className="text-lg">Case #{caseId}</b>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 0 ? "bg-blue-100 text-blue-700" :
          status === 1 ? "bg-yellow-100 text-yellow-700" :
          status === 2 ? "bg-purple-100 text-purple-700" :
          "bg-green-100 text-green-700"
        }`}>
          {STATUS[status]}
        </span>
      </div>
      
      {L.map((l, i) => (
        <div key={l} className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{l}:</span> {l === "status" ? STATUS[Number(raw[i])] : String(raw[i] ?? "")}
        </div>
      ))}

      {canSubmitDeliverable && (
        <div className="mt-4 pt-4 border-t flex flex-col gap-2">
          <input
            className="bg-gray-100 dark:bg-zinc-800 p-2 rounded text-sm"
            placeholder="Describe your deliverable..."
            value={deliverableText}
            onChange={(e) => setDeliverableText(e.target.value)}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors"
            onClick={handleSubmitDeliverable}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? "Submitting..." : "Submit Deliverable"}
          </button>
        </div>
      )}

      {canAcceptOrDispute && !showDisputeConfirm && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Review the deliverable and decide:
          </p>
          <div className="flex gap-2">
            <button
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors"
              onClick={handleAccept}
              disabled={isPending || isConfirming}
            >
              {isPending || isConfirming ? "..." : "✓ Accept & Pay"}
            </button>
            <button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition-colors"
              onClick={handleDisputeClick}
              disabled={isPending || isConfirming}
            >
              ✗ Dispute
            </button>
          </div>
        </div>
      )}

      {/* Dispute Confirmation Modal */}
      {showDisputeConfirm && (
        <div className="mt-4 pt-4 border-t">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🤖</div>
              <div className="flex-1">
                <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-1">
                  Initiate AI Arbitration
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                  An AI judge will immediately review the contract specifications and deliverables to make a <strong>final, binding decision</strong>. 
                  Funds will be automatically transferred to the winner.
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-4">
                  ⚡ Resolution typically takes 5-10 seconds. No lawyers. No delays.
                </p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition-colors"
                    onClick={handleDisputeConfirm}
                    disabled={isPending || isConfirming}
                  >
                    {isPending ? "Confirming..." : isConfirming ? "Processing..." : "Proceed with AI Arbitration"}
                  </button>
                  <button
                    className="px-4 py-2 rounded font-medium border border-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => setShowDisputeConfirm(false)}
                    disabled={isPending || isConfirming}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {aiError && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-950 rounded-lg border border-red-300 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-300">
            <strong>Resolution failed:</strong> {aiError}
          </div>
        </div>
      )}
    </div>
  );
}
