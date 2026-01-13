"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, ExternalLink, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// Types
type CaseStatus = "Funded" | "Submitted" | "Disputed" | "Resolved"
type CaseRole = "Payer" | "Payee"

interface CaseSummary {
  id: string
  payer: string
  payee: string
  amount: string
  status: CaseStatus
  reviewDeadline?: number // Unix timestamp
  evidenceDeadline?: number // Unix timestamp
  judgeDeadline?: number // Unix timestamp
  createdAt: number
}

// TODO: replace mockCases with wagmi reads
const mockCases: CaseSummary[] = [
  {
    id: "0x1a2b3c",
    payer: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    payee: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    amount: "2.5",
    status: "Submitted",
    reviewDeadline: Date.now() + 2 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "0x4d5e6f",
    payer: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    payee: "0x9876543210AbCdEf1234567890aBcDeF12345678",
    amount: "5.0",
    status: "Disputed",
    evidenceDeadline: Date.now() + 1 * 24 * 60 * 60 * 1000,
    judgeDeadline: Date.now() + 4 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  {
    id: "0x7g8h9i",
    payer: "0xAbCdEf1234567890aBcDeF1234567890aBcDeF12",
    payee: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    amount: "1.2",
    status: "Resolved",
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    id: "0xjklmno",
    payer: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    payee: "0xFedCbA0987654321FeDcBa0987654321FeDcBa09",
    amount: "3.8",
    status: "Funded",
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
]

const connectedAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// Helper functions
function getRole(caseSummary: CaseSummary, address: string): CaseRole {
  return caseSummary.payer.toLowerCase() === address.toLowerCase() ? "Payer" : "Payee"
}

function getNextDeadline(caseSummary: CaseSummary, now: number): number | null {
  if (caseSummary.status === "Submitted" && caseSummary.reviewDeadline) {
    return caseSummary.reviewDeadline
  }
  if (caseSummary.status === "Disputed") {
    if (caseSummary.evidenceDeadline && caseSummary.evidenceDeadline > now) {
      return caseSummary.evidenceDeadline
    }
    if (caseSummary.judgeDeadline) {
      return caseSummary.judgeDeadline
    }
  }
  return null
}

function formatCountdown(deadline: number, now: number): string {
  const diff = deadline - now
  if (diff <= 0) return "Overdue"

  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getStatusColor(status: CaseStatus): string {
  switch (status) {
    case "Funded":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "Submitted":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "Disputed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "Resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

function getRoleColor(role: CaseRole): string {
  return role === "Payer"
    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
}

export default function CasesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const now = Date.now()

  // Filter cases
  const filteredCases = mockCases.filter((c) => {
    const matchesSearch =
      searchQuery === "" ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.payer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.payee.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || c.status === statusFilter

    const matchesRole = roleFilter === "all" || getRole(c, connectedAddress) === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const handleClearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setRoleFilter("all")
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
            <Badge variant="outline" className="hidden sm:flex">
              {connectedAddress ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <Button asChild>
            <Link href="/create-case">Create case</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label htmlFor="search" className="mb-2 block text-sm font-medium">
                  Search
                </label>
                <Input
                  id="search"
                  placeholder="Case ID or counterparty address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <label htmlFor="status" className="mb-2 block text-sm font-medium">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Funded">Funded</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Disputed">Disputed</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <label htmlFor="role" className="mb-2 block text-sm font-medium">
                  Role
                </label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="Payer">Payer</SelectItem>
                    <SelectItem value="Payee">Payee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={handleClearFilters} className="w-full md:w-auto bg-transparent">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {filteredCases.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No cases yet</h3>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" || roleFilter !== "all"
                  ? "No cases match your filters. Try adjusting your search criteria."
                  : "Get started by creating your first escrow case."}
              </p>
              <Button asChild>
                <Link href="/create-case">Create case</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Desktop table */}
        {filteredCases.length > 0 && (
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next deadline</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => {
                  const role = getRole(c, connectedAddress)
                  const counterparty = role === "Payer" ? c.payee : c.payer
                  const deadline = getNextDeadline(c, now)

                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/case/${c.id}`} className="font-mono text-sm font-medium hover:underline">
                          {c.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium", getRoleColor(role))}>{role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{shortenAddress(counterparty)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleCopyAddress(counterparty)}
                            aria-label="Copy address"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{c.amount} ETH</TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium", getStatusColor(c.status))}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deadline ? formatCountdown(deadline, now) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/case/${c.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Mobile cards */}
        {filteredCases.length > 0 && (
          <div className="space-y-4 md:hidden">
            {filteredCases.map((c) => {
              const role = getRole(c, connectedAddress)
              const counterparty = role === "Payer" ? c.payee : c.payer
              const deadline = getNextDeadline(c, now)

              return (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/case/${c.id}`} className="font-mono text-sm font-medium hover:underline">
                          {c.id}
                        </Link>
                        <div className="mt-2 flex gap-2">
                          <Badge className={cn("text-xs font-medium", getRoleColor(role))}>{role}</Badge>
                          <Badge className={cn("text-xs font-medium", getStatusColor(c.status))}>{c.status}</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/case/${c.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Counterparty</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{shortenAddress(counterparty)}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleCopyAddress(counterparty)}
                          aria-label="Copy address"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">{c.amount} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next deadline</span>
                      <span className="font-medium">{deadline ? formatCountdown(deadline, now) : "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
