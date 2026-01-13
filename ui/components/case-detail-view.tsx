"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { ArrowLeft, FileText, ImageIcon, Calendar, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StatusBadge } from "@/components/status-badge"
import { AddressDisplay } from "@/components/address-display"
import { TimelineStepper } from "@/components/timeline-stepper"
import { AIArbitrationPanel } from "@/components/ai-arbitration-panel"
import { ESCROW_ABI, ESCROW_ADDRESS, textToBytes32Hash } from "@/lib/escrow"
import { formatEther } from "viem"
import { useToast } from "@/hooks/use-toast"

const STATUS_MAP: Record<number, "Funded" | "Submitted" | "Disputed" | "Resolved"> = {
  0: "Funded",
  1: "Submitted",
  2: "Disputed",
  3: "Resolved",
}

export function CaseDetailView({ caseId }: { caseId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const { address } = useAccount()
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [deliverableText, setDeliverableText] = useState("")
  const [showAIPanel, setShowAIPanel] = useState(false)

  const caseIdBigInt = BigInt(caseId)

  // Fetch case data
  const { data: caseData, refetch: refetchCase } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "cases",
    args: [caseIdBigInt],
  })

  const { writeContract: writeAccept, data: acceptTxHash, isPending: isAcceptPending } = useWriteContract()
  const { writeContract: writeDispute, data: disputeTxHash, isPending: isDisputePending } = useWriteContract()
  const { writeContract: writeSubmit, data: submitTxHash, isPending: isSubmitPending } = useWriteContract()

  const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } = useWaitForTransactionReceipt({
    hash: acceptTxHash,
  })
  const { isLoading: isDisputeConfirming, isSuccess: isDisputeSuccess } = useWaitForTransactionReceipt({
    hash: disputeTxHash,
  })
  const { isLoading: isSubmitConfirming, isSuccess: isSubmitSuccess } = useWaitForTransactionReceipt({
    hash: submitTxHash,
  })

  // Refresh case data on success
  useEffect(() => {
    if (isAcceptSuccess || isSubmitSuccess) {
      refetchCase()
      toast({
        title: "Transaction confirmed",
        description: "Case updated successfully.",
      })
    }
    if (isDisputeSuccess) {
      // Wait a bit for the transaction to be reflected on-chain
      setTimeout(() => {
        refetchCase()
        setShowAIPanel(true)
        toast({
          title: "Dispute opened",
          description: "AI arbitration has been initiated.",
        })
      }, 1000)
    }
  }, [isAcceptSuccess, isDisputeSuccess, isSubmitSuccess, refetchCase, toast])

  if (!caseData) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <h3 className="mb-2 text-lg font-semibold">Case not found</h3>
            <p className="mb-4 text-sm text-muted-foreground">The case you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/cases")}>Back to Cases</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const raw = caseData as readonly unknown[]
  const payer = raw[0] as string
  const payee = raw[1] as string
  const judge = raw[2] as string
  const amount = raw[3] as bigint
  const specs = raw[4] as string
  const deliverables = raw[5] as string
  const status = Number(raw[7] ?? 0)

  const statusLabel = STATUS_MAP[status] || "Funded"
  const isPayer = address?.toLowerCase() === payer.toLowerCase()
  const isPayee = address?.toLowerCase() === payee.toLowerCase()
  // For testing: allow payer to submit if they're also the payee
  const isSelfContract = payer.toLowerCase() === payee.toLowerCase()
  const role = isPayer ? "Payer" : isPayee ? "Payee" : null
  
  // Check if deliverables are empty (zero hash or empty string)
  const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000"
  const hasDeliverables = deliverables && deliverables !== zeroHash && deliverables !== "0x" && deliverables.length > 2
  
  // Debug logging
  useEffect(() => {
    console.log("Case Detail Debug:", {
      caseId,
      status,
      statusLabel,
      hasDeliverables,
      deliverables,
      isPayer,
      isPayee,
      isSelfContract,
      role,
    })
  }, [caseId, status, statusLabel, hasDeliverables, deliverables, isPayer, isPayee, isSelfContract, role])

  const handleAccept = () => {
    writeAccept({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "accept",
      args: [caseIdBigInt],
    })
  }

  const handleDispute = () => {
    setShowDisputeDialog(false)
    writeDispute({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "openDispute",
      args: [caseIdBigInt],
    })
  }

  const handleSubmitDeliverables = () => {
    if (!deliverableText) {
      toast({
        title: "Error",
        description: "Please enter a deliverable description",
        variant: "destructive",
      })
      return
    }
    writeSubmit({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "submitDeliverable",
      args: [caseIdBigInt, textToBytes32Hash(deliverableText), BigInt(7 * 24 * 60 * 60)],
    })
    setShowSubmitForm(false)
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/cases")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Case #{caseId}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={statusLabel} />
            <div className="text-right">
              <div className="font-mono text-2xl font-bold">{formatEther(amount)} ETH</div>
              <div className="text-xs text-muted-foreground">Escrow Amount</div>
            </div>
          </div>
        </div>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Payer</span>
              <AddressDisplay address={payer} isCurrentUser={isPayer} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Payee</span>
              <AddressDisplay address={payee} isCurrentUser={isPayee} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">AI Judge</span>
              <AddressDisplay address={judge} />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineStepper currentStatus={statusLabel} />
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hash: {specs.slice(0, 20)}... (Specifications stored on-chain as hash)
            </p>
          </CardContent>
        </Card>

        {/* Deliverables */}
        <Card>
          <CardHeader>
            <CardTitle>Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasDeliverables ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">No deliverables submitted yet</p>
                <p className="text-xs text-muted-foreground">
                  {(role === "Payee" || isSelfContract)
                    ? "Submit your completed work when ready"
                    : "Waiting for payee to submit deliverables"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Deliverables Submitted</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Hash: <code className="font-mono text-xs">{deliverables.slice(0, 20)}...</code>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Deliverables are stored on-chain as a hash. The AI judge will use this to evaluate the case.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Show dummy deliverable preview for testing */}
                {isSelfContract && (
                  <div className="rounded-lg border border-dashed border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground italic">
                      💡 Testing mode: You're both payer and payee. This is a self-contract for testing purposes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Arbitration (if disputed) */}
        {(status === 2 || showAIPanel) && (
          <AIArbitrationPanel
            caseData={{
              id: caseId,
              status: statusLabel,
            }}
            caseId={caseId}
            isActive={status === 2 || showAIPanel}
            onResolved={() => {
              setTimeout(() => {
                refetchCase()
              }, 1000)
            }}
          />
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            {role === "Payer" && status === 1 && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleAccept}
                  disabled={isAcceptPending || isAcceptConfirming}
                >
                  {isAcceptPending || isAcceptConfirming ? "Processing..." : "Accept & Release Payment"}
                </Button>
                <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      Open Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Open Dispute</DialogTitle>
                      <DialogDescription>This will initiate AI arbitration to resolve the dispute.</DialogDescription>
                    </DialogHeader>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        The AI judge's decision will be binding and final. Funds will be automatically distributed
                        based on the ruling.
                      </AlertDescription>
                    </Alert>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDispute}
                        disabled={isDisputePending || isDisputeConfirming}
                      >
                        {isDisputePending || isDisputeConfirming ? "Processing..." : "Confirm Dispute"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {((role === "Payee" || isSelfContract) && status === 0) && (
              <div>
                {!showSubmitForm ? (
                  <Button className="w-full" onClick={() => setShowSubmitForm(true)}>
                    Submit Deliverables
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Deliverables Description</label>
                      <Textarea
                        placeholder="Describe what you've completed..."
                        value={deliverableText}
                        onChange={(e) => setDeliverableText(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => setShowSubmitForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSubmitDeliverables}
                        disabled={isSubmitPending || isSubmitConfirming}
                      >
                        {isSubmitPending || isSubmitConfirming ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(status === 2 || status === 3) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {status === 3
                    ? "This case has been resolved. No further actions are available."
                    : "AI arbitration is in progress. Please wait for the decision."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
