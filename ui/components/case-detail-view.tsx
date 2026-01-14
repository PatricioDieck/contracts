"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { ArrowLeft, FileText, AlertCircle, Upload, X, Loader2 } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { useCase } from "@/hooks/use-case"
import { useQueryClient } from "@tanstack/react-query"

export function CaseDetailView({ caseId }: { caseId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [deliverableText, setDeliverableText] = useState("")
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const caseIdBigInt = BigInt(caseId)

  // Fetch case data from database
  const { data: caseDataWithRelations, isLoading, error } = useCase(caseId)
  const caseData = caseDataWithRelations?.case

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

  // Sync database after contract writes
  const syncCaseFromChain = async () => {
    try {
      await fetch(`/api/cases/${caseId}/sync`, { method: 'POST' })
      // Invalidate queries to refetch updated data from DB
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    } catch (error) {
      console.error('Failed to sync case:', error)
    }
  }

  // Refresh case data on success
  useEffect(() => {
    if (isAcceptSuccess) {
      syncCaseFromChain().then(() => {
        toast({
          title: "Payment Released",
          description: "Case accepted and payment sent to payee.",
        })
      })
    }
    if (isSubmitSuccess) {
      syncCaseFromChain().then(() => {
        toast({
          title: "Deliverables Submitted",
          description: "Your work has been submitted for review.",
        })
      })
    }
    if (isDisputeSuccess) {
      syncCaseFromChain().then(() => {
        setShowAIPanel(true)
        toast({
          title: "Dispute Opened",
          description: "AI arbitration has been initiated.",
        })
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAcceptSuccess, isDisputeSuccess, isSubmitSuccess, caseId])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card>
          <CardContent className="flex flex-col  items-center py-16">
            <div className="text-sm text-muted-foreground">Loading case...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error or not found state
  if (error || !caseData) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <h3 className="mb-2 text-lg font-semibold">Case not found</h3>
            <p className="mb-4 text-sm text-muted-foreground">The case you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={() => router.push("/cases")}>Back to Cases</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Extract data from DB case
  const payer = caseData.payerAddress
  const payee = caseData.payeeAddress
  const judge = caseData.judgeAddress
  const amountEth = parseFloat(caseData.amountEth || '0')
  const statusLabel = caseData.status
  const specsHash = caseData.specsHash
  const deliverablesHash = caseData.deliverablesHash
  const deliverables = caseDataWithRelations?.deliverables || []

  const isPayer = address && payer ? address.toLowerCase() === payer.toLowerCase() : false
  const isPayee = address && payee ? address.toLowerCase() === payee.toLowerCase() : false
  const isSelfContract = payer && payee ? payer.toLowerCase() === payee.toLowerCase() : false
  const role = isPayer ? "Payer" : isPayee ? "Payee" : null
  
  const hasDeliverables = !!deliverablesHash && deliverablesHash !== "0x0000000000000000000000000000000000000000000000000000000000000000"

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

  const handleSubmitDeliverables = async () => {
    if (!deliverableText && selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a description or upload files",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Upload files to blob storage first
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('caseIdOnChain', caseId)
        formData.append('uploadedBy', address || '')

        const response = await fetch('/api/deliverables/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }

      // Build deliverable hash from text + file names
      const allContent = [
        deliverableText,
        ...selectedFiles.map(f => f.name)
      ].filter(Boolean).join('\n')

      // Submit to contract
      writeSubmit({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "submitDeliverable",
        args: [caseIdBigInt, textToBytes32Hash(allContent), BigInt(7 * 24 * 60 * 60)],
      })

      setShowSubmitForm(false)
      setSelectedFiles([])
      setDeliverableText("")
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload deliverables",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
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
              <h2 className="text-2xl font-bold">
                {caseData.title || `Case #${caseId}`}
              </h2>
              <p className="text-sm text-muted-foreground">Case #{caseId}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={statusLabel} />
            <div className="text-right">
              <div className="font-mono text-2xl font-bold">{amountEth.toFixed(3)} ETH</div>
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
          <CardContent className="space-y-4">
            {caseData.title && (
              <div>
                <h4 className="text-sm font-semibold mb-1">{caseData.title}</h4>
                {caseData.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{caseData.description}</p>
                )}
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Hash: <code className="font-mono">{specsHash?.slice(0, 20)}...</code> (stored on-chain)
              </p>
              {caseData.specsBlobUrl && (
                <a 
                  href={caseData.specsBlobUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 block"
                >
                  View full specifications →
                </a>
              )}
            </div>
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
                {deliverables.length > 0 ? (
                  <div className="space-y-2">
                    {deliverables.map((deliverable) => (
                      <div key={deliverable.id} className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">{deliverable.fileName}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {deliverable.fileType} • {deliverable.fileSizeBytes ? `${(deliverable.fileSizeBytes / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </p>
                            {deliverable.blobUrl && (
                              <a 
                                href={deliverable.blobUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View file →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Deliverables Submitted</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Hash: <code className="font-mono text-xs">{deliverablesHash?.slice(0, 20)}...</code>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Deliverables are stored on-chain as a hash. The AI judge will use this to evaluate the case.
                        </p>
                        {caseData.deliverablesBlobUrl && (
                          <a 
                            href={caseData.deliverablesBlobUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-2 block"
                          >
                            View deliverables →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Show dummy deliverable preview for testing */}
                {isSelfContract && (
                  <div className="rounded-lg border border-dashed border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground italic">
                      💡 Testing mode: You&apos;re both payer and payee. This is a self-contract for testing purposes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Arbitration (if disputed) */}
        {(statusLabel === 'Disputed' || showAIPanel) && (
          <AIArbitrationPanel
            caseData={{
              id: caseId,
              status: statusLabel,
              aiRationale: caseData.aiRationale || undefined,
              winner: caseData.aiWinner as "Payer" | "Payee" | undefined,
            }}
            caseId={caseId}
            isActive={statusLabel === 'Disputed' || showAIPanel}
            onResolved={async () => {
              // First sync the database from the blockchain
              await syncCaseFromChain()
              toast({
                title: "Case Resolved",
                description: "The AI judge has made a decision.",
              })
            }}
          />
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            {role === "Payer" && statusLabel === 'Submitted' && (
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
                        The AI judge&apos;s decision will be binding and final. Funds will be automatically distributed
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

            {((role === "Payee" || isSelfContract) && statusLabel === 'Funded') && (
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
                        placeholder="Describe what you&apos;ve completed..."
                        value={deliverableText}
                        onChange={(e) => setDeliverableText(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* File Upload Section */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">Upload Files (optional)</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 bg-transparent"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Choose Files
                      </Button>
                      
                      {/* Selected Files List */}
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm">{file.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => {
                          setShowSubmitForm(false)
                          setSelectedFiles([])
                          setDeliverableText("")
                        }}
                        disabled={isUploading}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSubmitDeliverables}
                        disabled={isSubmitPending || isSubmitConfirming || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : isSubmitPending || isSubmitConfirming ? (
                          "Submitting..."
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(statusLabel === 'Disputed' || statusLabel === 'Resolved') && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {statusLabel === 'Resolved'
                    ? caseData.aiWinner 
                      ? `This case has been resolved. Winner: ${caseData.aiWinner}`
                      : "This case has been resolved. No further actions are available."
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
