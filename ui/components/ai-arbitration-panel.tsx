"use client"

import { useEffect, useRef } from "react"
import { Brain, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useCompletion } from "@ai-sdk/react"
import type { CaseStatus } from "./status-badge"

interface CaseData {
  id: string | number
  status: CaseStatus
  aiRationale?: string
  winner?: "Payer" | "Payee"
}

export function AIArbitrationPanel({
  caseData,
  caseId,
  isActive,
  onResolved,
}: {
  caseData: CaseData
  caseId: string | number
  isActive: boolean
  onResolved?: () => void
}) {
  const streamContainerRef = useRef<HTMLDivElement>(null)

  // Vercel AI SDK useCompletion hook - handles all streaming state
  const {
    completion, // The streamed text
    isLoading, // Is currently streaming
    error, // Any error that occurred
    complete, // Function to trigger completion
  } = useCompletion({
    api: "/api/resolve",
    streamProtocol: "text",
    onFinish: () => {
      // Contract call happens server-side in onFinish
      // Wait for the transaction to be mined, then refresh
      setTimeout(async () => {
        await onResolved?.()
      }, 4000) // Give 4 seconds for tx to be mined
    },
    onError: (err) => {
      console.error("AI resolution error:", err)
    },
  })

  // Auto-scroll as text streams in
  useEffect(() => {
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight
    }
  }, [completion])

  // Parse winner from completion text
  const getWinner = () => {
    if (completion.includes("DECISION: PAYEE WINS")) return "Payee"
    if (completion.includes("DECISION: PAYER WINS")) return "Payer"
    return null
  }

  const winner = getWinner()
  const isComplete = !isLoading && winner
  const isResolved = caseData.status === "Resolved"
  const isDisputed = caseData.status === "Disputed"

  // Manual trigger function - NO auto-trigger
  const handleStartArbitration = () => {
    if (!isLoading && !completion) {
      complete(`caseId:${caseId}`)
    }
  }

  // Only show panel if:
  // - Case is disputed (show "Start" button)
  // - Currently streaming AI response
  // - Case is resolved (show results)
  if (!isDisputed && !isResolved && !isLoading && !completion) {
    return null
  }

  return (
    <Card className="border-purple-500/20 bg-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-black" />
          <CardTitle className="text-black">AI Arbitration</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Resolution failed:</strong> {error.message}
            </AlertDescription>
            <Button
              onClick={handleStartArbitration}
              className="mt-2"
              size="sm"
              variant="outline"
              disabled={isLoading}
            >
              Retry AI Arbitration
            </Button>
          </Alert>
        )}

        {/* Disputed - waiting to start AI */}
        {isDisputed && !isLoading && !completion && !error && (
          <div className="text-center py-4">
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-2">
                ⚖️ This case is under dispute
              </p>
              <p className="text-xs text-amber-700">
                Click below to have the AI judge review the case and make a binding decision.
              </p>
            </div>
            <Button 
              onClick={handleStartArbitration} 
              className="gap-2"
              size="lg"
            >
              <Brain className="h-4 w-4" />
              Start AI Arbitration
            </Button>
          </div>
        )}

        {/* AI is currently analyzing */}
        {isLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI is analyzing the case...</span>
            </div>
            <div
              ref={streamContainerRef}
              className="space-y-2 rounded-lg bg-slate-50 p-4 font-mono text-xs max-h-64 overflow-y-auto border border-slate-200"
            >
              {completion.split("\n").map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-slate-400">›</span>
                  <span>{line || " "}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 text-slate-500">
                <span className="animate-pulse">▋</span>
              </div>
            </div>
          </div>
        )}

        {/* AI completed - show streaming result */}
        {!isLoading && completion && !isResolved && (
          <div className="space-y-4">
            <div
              ref={streamContainerRef}
              className="space-y-2 rounded-lg bg-slate-50 p-4 font-mono text-xs max-h-64 overflow-y-auto border border-slate-200"
            >
              {completion.split("\n").map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-slate-400">›</span>
                  <span>{line || " "}</span>
                </div>
              ))}
            </div>
            {winner && (
              <Alert
                className={
                  winner === "Payee"
                    ? "border-green-500/50 bg-green-50"
                    : "border-amber-500/50 bg-amber-50"
                }
              >
                <AlertDescription className="font-semibold">
                  DECISION: {winner.toUpperCase()} WINS
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Waiting for blockchain confirmation...
            </p>
          </div>
        )}

        {/* Case already resolved - show stored results */}
        {isResolved && caseData.winner && (
          <div className="space-y-4">
            <Alert
              className={
                caseData.winner === "Payee"
                  ? "border-green-500/50 bg-green-50"
                  : "border-amber-500/50 bg-amber-50"
              }
            >
              <AlertDescription className="font-semibold">
                DECISION: {caseData.winner.toUpperCase()} WINS
              </AlertDescription>
            </Alert>

            {caseData.aiRationale && (
              <div className="space-y-2">
                <p className="text-sm font-medium">AI Rationale</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {caseData.aiRationale}
                </p>
              </div>
            )}

            <Alert className="border-green-500/50 bg-green-50">
              <AlertDescription className="text-sm">
                ✓ Funds have been transferred to{" "}
                {caseData.winner === "Payee" ? "the payee" : "the payer"}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Resolved but no winner stored (edge case) */}
        {isResolved && !caseData.winner && (
          <Alert className="border-slate-500/50 bg-slate-50">
            <AlertDescription className="text-sm">
              This case has been resolved.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
