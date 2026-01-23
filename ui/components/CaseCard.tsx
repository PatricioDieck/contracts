"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useCompletion } from "@ai-sdk/react";
import { formatEther } from "viem";
import { acceptCase, openDispute, submitDeliverable } from "../lib/contract.actions";
import { type Case, STATUS_LABELS } from "../lib/contract";

// =============================================================================
// Main Component
// =============================================================================

type CardMode = "viewing" | "disputing" | "streaming";

export function CaseCard({ case: c, onAction }: { case: Case; onAction?: () => void }) {
  const { address } = useAccount();
  const [mode, setMode] = useState<CardMode>("viewing");
  const [deliverableText, setDeliverableText] = useState("");

  const { completion, isLoading, error, complete } = useCompletion({
    api: "/api/resolve",
    streamProtocol: "text",
    onFinish: () => setTimeout(() => onAction?.(), 2000),
    onError: () => { setMode("viewing"); },
  });

  const { writeContract, isPending } = useWriteContract({
    mutation: {
      onSuccess: () => {
        if (mode === "disputing") {
          setMode("streaming");
          complete(`caseId:${c.id}`);
        } else {
          onAction?.();
        }
      },
    },
  });

  const isPayer = address?.toLowerCase() === c.payer.toLowerCase();
  const isPayee = address?.toLowerCase() === c.payee.toLowerCase();

  const handleDispute = () => {
    setMode("disputing");
    writeContract(openDispute(c.id));
  };

  // Show AI streaming view
  if (mode === "streaming" || isLoading || completion) {
    return <AIStreamingView caseId={c.id} completion={completion} isLoading={isLoading} />;
  }

  return (
    <div className="border p-4 rounded-lg bg-white dark:bg-zinc-900">
      <Header caseId={c.id} status={c.status} />
      <Details c={c} />

      {/* Payee can submit deliverable when funded */}
      {c.status === 0 && isPayee && (
        <DeliverableForm
          value={deliverableText}
          onChange={setDeliverableText}
          onSubmit={() => {
            if (!deliverableText) return alert("Enter deliverable description");
            writeContract(submitDeliverable(c.id, deliverableText));
          }}
          isPending={isPending}
        />
      )}

      {/* Payer can accept or dispute when submitted */}
      {c.status === 1 && isPayer && (
        <AcceptDisputeActions
          onAccept={() => writeContract(acceptCase(c.id))}
          onDispute={handleDispute}
          isPending={isPending}
        />
      )}

      {error && <ErrorMessage message={error.message} />}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function Header({ caseId, status }: { caseId: number; status: number }) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
  ];
  return (
    <div className="flex justify-between items-start mb-3">
      <b className="text-lg">Case #{caseId}</b>
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
      </span>
    </div>
  );
}

function Details({ c }: { c: Case }) {
  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const shortenHash = (hash: string) => hash === "0x0000000000000000000000000000000000000000000000000000000000000000" 
    ? "—" 
    : `${hash.slice(0, 10)}...`;

  return (
    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
      <div><span className="font-medium">payer:</span> {shortenAddress(c.payer)}</div>
      <div><span className="font-medium">payee:</span> {shortenAddress(c.payee)}</div>
      <div><span className="font-medium">amount:</span> {formatEther(c.amount)} ETH</div>
      <div><span className="font-medium">specs:</span> {shortenHash(c.specs)}</div>
      <div><span className="font-medium">deliverables:</span> {shortenHash(c.deliverables)}</div>
      <div><span className="font-medium">status:</span> {STATUS_LABELS[c.status]}</div>
    </div>
  );
}

function DeliverableForm({ value, onChange, onSubmit, isPending }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="mt-4 pt-4 border-t flex flex-col gap-2">
      <input
        className="bg-gray-100 dark:bg-zinc-800 p-2 rounded text-sm"
        placeholder="Describe your deliverable..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors"
        onClick={onSubmit}
        disabled={isPending}
      >
        {isPending ? "Submitting..." : "Submit Deliverable"}
      </button>
    </div>
  );
}

function AcceptDisputeActions({ onAccept, onDispute, isPending }: {
  onAccept: () => void;
  onDispute: () => void;
  isPending: boolean;
}) {
  return (
    <div className="mt-4 pt-4 border-t">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Review the deliverable and decide:</p>
      <div className="flex gap-2">
        <button
          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors"
          onClick={onAccept}
          disabled={isPending}
        >
          {isPending ? "..." : "Accept & Pay"}
        </button>
        <button
          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition-colors"
          onClick={onDispute}
          disabled={isPending}
        >
          Dispute
        </button>
      </div>
    </div>
  );
}

function AIStreamingView({ caseId, completion, isLoading }: {
  caseId: number;
  completion: string;
  isLoading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [completion]);

  const winner = completion.includes("DECISION: PAYEE WINS") ? "payee"
    : completion.includes("DECISION: PAYER WINS") ? "payer"
    : null;
  const isComplete = !isLoading && winner;

  return (
    <div className={`border-2 p-6 rounded-lg transition-all duration-500 ${
      isComplete
        ? winner === "payee"
          ? "border-green-500 bg-green-50 dark:bg-green-950"
          : "border-orange-500 bg-orange-50 dark:bg-orange-950"
        : "border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950"
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-3xl ${isLoading ? "animate-pulse" : ""}`}>
          {isComplete ? (winner === "payee" ? "✅" : "↩️") : "🤖"}
        </div>
        <div>
          <h3 className="text-lg font-bold">
            {isComplete ? `Case #${caseId} Resolved` : "AI Judge Analyzing..."}
          </h3>
          {isComplete && (
            <div className={`text-sm font-bold ${
              winner === "payee" ? "text-green-700 dark:text-green-300" : "text-orange-700 dark:text-orange-300"
            }`}>
              {winner === "payee" ? "Payee Wins" : "Payer Wins"}
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-white dark:bg-zinc-900 rounded-lg p-4 border max-h-48 overflow-y-auto font-mono text-sm"
      >
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {completion}
          {isLoading && <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5" />}
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
            Analyzing contract...
          </span>
        ) : isComplete ? (
          <span className="text-green-600 dark:text-green-400 font-medium">
            Funds automatically transferred to winner
          </span>
        ) : (
          "Waiting for decision..."
        )}
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 p-3 bg-red-100 dark:bg-red-950 rounded-lg border border-red-300 dark:border-red-800">
      <div className="text-sm text-red-700 dark:text-red-300">
        <strong>Resolution failed:</strong> {message}
      </div>
    </div>
  );
}
