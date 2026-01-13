"use client"

import { useState, useEffect, useRef } from "react"
import { Brain } from "lucide-react"
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
  const hasTriggeredAI = useRef(false)
  const lastCaseId = useRef<string | number | null>(null)

  // Vercel AI SDK useCompletion hook - handles all streaming state
  const {
    completion, // The streamed text
    isLoading, // Is currently streaming
    error, // Any error that occurred
    complete, // Function to trigger completion
  } = useCompletion({
    api: "/api/resolve",
    streamProtocol: "text", // Use text protocol to match toTextStreamResponse()
    onFinish: () => {
      // Contract call happens server-side in onFinish
      // Just refresh the UI after a delay
      setTimeout(() => {
        onResolved?.()
      }, 2000)
    },
    onError: (err) => {
      console.error("AI resolution error:", err)
      hasTriggeredAI.current = false // Reset on error so it can retry
    },
  })

  // Reset trigger when caseId changes
  useEffect(() => {
    if (lastCaseId.current !== caseId) {
      lastCaseId.current = caseId
      hasTriggeredAI.current = false
    }
  }, [caseId])

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
  const isResolved = caseData.status === "Resolved" && caseData.winner

  // Auto-trigger AI when panel becomes active and not already triggered
  useEffect(() => {
    if (isActive && !hasTriggeredAI.current && !isLoading && !completion && !isResolved) {
      hasTriggeredAI.current = true
      console.log("Triggering AI arbitration for case:", caseId)
      complete(`caseId:${caseId}`)
    }
  }, [isActive, caseId, complete, isLoading, completion, isResolved])

  // Manual trigger function
  const handleManualTrigger = () => {
    hasTriggeredAI.current = true
    complete(`caseId:${caseId}`)
  }

  // Show panel if disputed, actively streaming, or resolved with AI
  if (!isActive && !isLoading && !completion && !isResolved) {
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
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Resolution failed:</strong> {error.message}
            </AlertDescription>
            <Button
              onClick={handleManualTrigger}
              className="mt-2"
              size="sm"
              variant="outline"
            >
              Retry AI Arbitration
            </Button>
          </Alert>
        )}

        {!isLoading && !completion && !isResolved && isActive && (
          <div className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              AI arbitration will begin automatically. If it doesn't start, click below.
            </p>
            <Button onClick={handleManualTrigger} className="gap-2">
              <Brain className="h-4 w-4" />
              Start AI Review
            </Button>
          </div>
        )}

        {(isLoading || completion) && (
          <div
            ref={streamContainerRef}
            className="space-y-2 rounded-lg bg-white p-4 font-mono text-xs max-h-64 overflow-y-auto border border-gray-200"
          >
            {completion.split("\n").map((line, i) => (
              <div key={i} className="flex items-start gap-2 text-black">
                <span className="">›</span>
                <span>{line || " "}</span>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-1 text-black">
                <span className="animate-pulse">▋</span>
              </div>
            )}
          </div>
        )}

        {(isComplete || isResolved) && (winner || caseData.winner) && (
          <div className="space-y-4">
            <Alert
              className={
                (winner || caseData.winner) === "Payee"
                  ? "border-green-500/50 bg-green-50"
                  : "border-red-500/50 bg-red-50"
              }
            >
              <AlertDescription className="font-semibold">
                DECISION: {(winner || caseData.winner)?.toUpperCase()} WINS
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Rationale</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {caseData.aiRationale ||
                  "The AI judge has determined the outcome based on the case evidence."}
              </p>
            </div>

            {isResolved && (
              <Alert className="border-green-500/50">
                <AlertDescription className="text-sm">
                  ✓ Funds have been transferred to{" "}
                  {caseData.winner === "Payee" ? "the payee" : "the payer"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
