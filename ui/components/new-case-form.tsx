"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Plus, X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ESCROW_ABI, ESCROW_ADDRESS, AI_JUDGE_ADDRESS, textToBytes32Hash } from "@/lib/escrow"
import { parseEther, decodeEventLog } from "viem"
import { useQueryClient } from "@tanstack/react-query"

interface Deliverable {
  id: string
  name: string
  description: string
}

export function NewCaseForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [payeeAddress, setPayeeAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [completionDeadline, setCompletionDeadline] = useState("")
  const [reviewWindow, setReviewWindow] = useState("")
  const [deliverables, setDeliverables] = useState<Deliverable[]>([{ id: "1", name: "", description: "" }])
  const [artifacts, setArtifacts] = useState<Deliverable[]>([])
  const [isSavingToDb, setIsSavingToDb] = useState(false)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash })

  const addDeliverable = () => {
    setDeliverables([...deliverables, { id: Date.now().toString(), name: "", description: "" }])
  }

  const removeDeliverable = (id: string) => {
    setDeliverables(deliverables.filter((d) => d.id !== id))
  }

  const updateDeliverable = (id: string, field: "name" | "description", value: string) => {
    setDeliverables(deliverables.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  const addArtifact = () => {
    setArtifacts([...artifacts, { id: Date.now().toString(), name: "", description: "" }])
  }

  const removeArtifact = (id: string) => {
    setArtifacts(artifacts.filter((a) => a.id !== id))
  }

  const updateArtifact = (id: string, field: "name" | "description", value: string) => {
    setArtifacts(artifacts.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  // Combine all form data into specs text
  const buildSpecsText = () => {
    const parts = [
      `Title: ${title}`,
      `Description: ${description}`,
      `Completion Deadline: ${completionDeadline}`,
      `Review Window: ${reviewWindow} days`,
      "",
      "Deliverables:",
      ...deliverables.map((d, i) => `${i + 1}. ${d.name}: ${d.description}`),
    ]
    if (artifacts.length > 0) {
      parts.push("", "Artifact Requirements:")
      artifacts.forEach((a, i) => parts.push(`${i + 1}. ${a.name}: ${a.description}`))
    }
    return parts.join("\n")
  }

  const handleSubmit = async () => {
    if (!title || !payeeAddress || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (!AI_JUDGE_ADDRESS) {
      toast({
        title: "Error",
        description: "AI Judge address not configured",
        variant: "destructive",
      })
      return
    }

    try {
      const specsText = buildSpecsText()
      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "createCase",
        args: [payeeAddress as `0x${string}`, textToBytes32Hash(specsText), AI_JUDGE_ADDRESS],
        value: parseEther(amount),
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create case",
        variant: "destructive",
      })
    }
  }

  // Save to database after transaction is confirmed
  useEffect(() => {
    async function saveToDatabase() {
      if (!isSuccess || !txReceipt || !address) return
      
      // Prevent duplicate saves
      if (isSavingToDb) return
      setIsSavingToDb(true)

      try {
        // Parse the CaseCreated event from transaction logs
        const caseCreatedEvent = txReceipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: ESCROW_ABI,
              data: log.data,
              topics: log.topics,
            })
            return decoded.eventName === 'CaseCreated'
          } catch {
            return false
          }
        })

        if (!caseCreatedEvent) {
          throw new Error('CaseCreated event not found in transaction')
        }

        const decoded = decodeEventLog({
          abi: ESCROW_ABI,
          data: caseCreatedEvent.data,
          topics: caseCreatedEvent.topics,
        })

        // Extract caseId from decoded args (indexed parameter)
        const args = decoded.args as unknown as { caseId: bigint }
        const caseIdOnChain = Number(args.caseId)

        // Build specs text for storage
        const specsText = buildSpecsText()

        // Save to database via API
        const response = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseIdOnChain,
            payerAddress: address,
            payeeAddress,
            judgeAddress: AI_JUDGE_ADDRESS,
            title,
            description,
            amountEth: amount,
            specsHash: textToBytes32Hash(specsText),
            specsText,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.error('Failed to save to database:', error)
          // Don't throw - case is already on-chain, this is just metadata
        }

        // Invalidate queries to refresh the cases list
        queryClient.invalidateQueries({ queryKey: ['cases'] })

        toast({
          title: "Case Created",
          description: `Case #${caseIdOnChain} has been created successfully.`,
        })

        // Navigate to the new case
        router.push(`/cases/${caseIdOnChain}`)
      } catch (error) {
        console.error('Error saving case to database:', error)
        toast({
          title: "Case Created",
          description: "Case created on-chain. Metadata sync may be pending.",
        })
        router.push("/cases")
      }
    }

    saveToDatabase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txReceipt, address, payeeAddress, title, description, amount, queryClient, toast, router, isSavingToDb])

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/cases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Create New Case</h2>
            <p className="text-sm text-muted-foreground">Set up an escrow agreement with AI arbitration</p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide the core details of your agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Title</label>
              <Input placeholder="e.g., Website Redesign" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the work to be done..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>Set the payment terms for this agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Payee Address</label>
              <Input
                placeholder="0x..."
                value={payeeAddress}
                onChange={(e) => setPayeeAddress(e.target.value)}
                className="font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">The Ethereum address that will receive payment</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Amount (ETH)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="2.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Deadlines</CardTitle>
            <CardDescription>Define the timeline for completion and review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Completion Deadline</label>
              <Input type="date" value={completionDeadline} onChange={(e) => setCompletionDeadline(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Review Window (days)</label>
              <Input
                type="number"
                placeholder="7"
                value={reviewWindow}
                onChange={(e) => setReviewWindow(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">How long the payer has to review and accept or dispute</p>
            </div>
          </CardContent>
        </Card>

        {/* Deliverables */}
        <Card>
          <CardHeader>
            <CardTitle>Deliverables</CardTitle>
            <CardDescription>List what the payee must deliver</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliverables.map((deliverable, index) => (
              <div key={deliverable.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Deliverable {index + 1}</span>
                  {deliverables.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeDeliverable(deliverable.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Name"
                  value={deliverable.name}
                  onChange={(e) => updateDeliverable(deliverable.id, "name", e.target.value)}
                />
                <Textarea
                  placeholder="Description"
                  value={deliverable.description}
                  onChange={(e) => updateDeliverable(deliverable.id, "description", e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            <Button variant="outline" onClick={addDeliverable} className="w-full gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Add Deliverable
            </Button>
          </CardContent>
        </Card>

        {/* Artifact Requirements (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Artifact Requirements (Optional)</CardTitle>
            <CardDescription>Specific files or formats required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {artifacts.length === 0 ? (
              <Button variant="outline" onClick={addArtifact} className="w-full gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Add Artifact Requirement
              </Button>
            ) : (
              <>
                {artifacts.map((artifact, index) => (
                  <div key={artifact.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Artifact {index + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeArtifact(artifact.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="e.g., Source Files"
                      value={artifact.name}
                      onChange={(e) => updateArtifact(artifact.id, "name", e.target.value)}
                    />
                    <Textarea
                      placeholder="e.g., All PSD files with organized layers"
                      value={artifact.description}
                      onChange={(e) => updateArtifact(artifact.id, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={addArtifact} className="w-full gap-2 bg-transparent">
                  <Plus className="h-4 w-4" />
                  Add Another
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="sticky bottom-0 flex gap-3 border-t border-border bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => router.push("/cases")}
            disabled={isPending || isConfirming}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isPending || isConfirming || !title || !payeeAddress || !amount}
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Create Case"}
          </Button>
        </div>
      </div>
    </div>
  )
}
