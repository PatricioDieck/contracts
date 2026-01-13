"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, X } from "lucide-react"
import Link from "next/link"

type Deliverable = {
  id: string
  name: string
  description: string
}

type ArtifactRequirement = {
  id: string
  name: string
  description: string
}

export default function CreateCasePage() {
  const [caseTitle, setCaseTitle] = useState("")
  const [caseDescription, setCaseDescription] = useState("")
  const [payeeAddress, setPayeeAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("ETH")
  const [completionDeadline, setCompletionDeadline] = useState("")
  const [reviewDeadline, setReviewDeadline] = useState("")
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [artifacts, setArtifacts] = useState<ArtifactRequirement[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addDeliverable = () => {
    const newDeliverable: Deliverable = {
      id: `deliverable-${Date.now()}`,
      name: "",
      description: "",
    }
    setDeliverables([...deliverables, newDeliverable])
  }

  const removeDeliverable = (id: string) => {
    setDeliverables(deliverables.filter((d) => d.id !== id))
  }

  const updateDeliverable = (id: string, field: "name" | "description", value: string) => {
    setDeliverables(deliverables.map((d) => (d.id === id ? { ...d, [field]: value } : d)))
  }

  const addArtifact = () => {
    const newArtifact: ArtifactRequirement = {
      id: `artifact-${Date.now()}`,
      name: "",
      description: "",
    }
    setArtifacts([...artifacts, newArtifact])
  }

  const removeArtifact = (id: string) => {
    setArtifacts(artifacts.filter((a) => a.id !== id))
  }

  const updateArtifact = (id: string, field: "name" | "description", value: string) => {
    setArtifacts(artifacts.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: Replace with actual wagmi call to create escrow contract
    console.log("[v0] Creating case with data:", {
      caseTitle,
      caseDescription,
      payeeAddress,
      amount,
      currency,
      completionDeadline,
      reviewDeadline,
      deliverables,
      artifacts,
    })

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // TODO: Redirect to case detail page after creation
    setIsSubmitting(false)
    alert("Case created successfully! (This would redirect to the case detail page)")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/cases">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Create New Case</h1>
              <p className="text-sm text-muted-foreground">
                Set up a new escrow contract with deliverables and payment terms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Provide the core details about this escrow case</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Case Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Website Redesign Project"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Case Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the work to be completed, expectations, and any special requirements..."
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Specify the payee and payment amount for this escrow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payee">Payee Address</Label>
                <Input
                  id="payee"
                  placeholder="0x..."
                  value={payeeAddress}
                  onChange={(e) => setPayeeAddress(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The Ethereum address of the freelancer/contractor who will receive payment
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Deadlines</CardTitle>
              <CardDescription>Set important dates for work completion and review periods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="completion-deadline">Completion Deadline</Label>
                  <Input
                    id="completion-deadline"
                    type="datetime-local"
                    value={completionDeadline}
                    onChange={(e) => setCompletionDeadline(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">When the payee must submit deliverables</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-deadline">Review Deadline</Label>
                  <Input
                    id="review-deadline"
                    type="datetime-local"
                    value={reviewDeadline}
                    onChange={(e) => setReviewDeadline(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">How long you have to review and accept/dispute</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
              <CardDescription>Define the specific work items that must be completed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliverables.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No deliverables added yet. Click below to add your first deliverable.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deliverables.map((deliverable, index) => (
                    <div key={deliverable.id} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Deliverable {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDeliverable(deliverable.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Deliverable name"
                          value={deliverable.name}
                          onChange={(e) => updateDeliverable(deliverable.id, "name", e.target.value)}
                          required
                        />
                        <Textarea
                          placeholder="Describe this deliverable..."
                          value={deliverable.description}
                          onChange={(e) => updateDeliverable(deliverable.id, "description", e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" onClick={addDeliverable} className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Add Deliverable
              </Button>
            </CardContent>
          </Card>

          {/* Artifact Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Artifact Requirements</CardTitle>
              <CardDescription>Specify what files or evidence must be submitted with deliverables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {artifacts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No artifact requirements added yet. These are optional.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {artifacts.map((artifact, index) => (
                    <div key={artifact.id} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Artifact {index + 1}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArtifact(artifact.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Artifact name (e.g., Source Code, Design Files)"
                          value={artifact.name}
                          onChange={(e) => updateArtifact(artifact.id, "name", e.target.value)}
                        />
                        <Textarea
                          placeholder="Describe what this artifact should contain..."
                          value={artifact.description}
                          onChange={(e) => updateArtifact(artifact.id, "description", e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" onClick={addArtifact} className="w-full bg-transparent">
                <Plus className="mr-2 h-4 w-4" />
                Add Artifact Requirement
              </Button>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Ready to create this case?</p>
              <p className="text-xs text-muted-foreground">
                This will lock {amount || "0"} {currency} in escrow and notify the payee
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/cases">
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Case..." : "Create Case"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
