"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/status-badge"
import { RoleBadge } from "@/components/role-badge"
import { AddressDisplay } from "@/components/address-display"
import { useCases } from "@/hooks/use-cases"
import type { Case } from "@/db/schema"

export function CasesListView() {
  const router = useRouter()
  const { address } = useAccount()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Fetch cases from database via API
  const { data: cases = [], isLoading: isLoadingCases } = useCases()

  const getUserRole = (caseItem: Case): "Payer" | "Payee" => {
    if (!address) return "Payer"
    return caseItem.payerAddress.toLowerCase() === address.toLowerCase() ? "Payer" : "Payee"
  }

  const filteredCases = cases.filter((caseItem) => {
    const matchesSearch =
      searchQuery === "" ||
      caseItem.caseIdOnChain.toString().includes(searchQuery) ||
      caseItem.payerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.payeeAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (caseItem.title || "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter

    const role = getUserRole(caseItem)
    const matchesRole = roleFilter === "all" || role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setRoleFilter("all")
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || roleFilter !== "all"

  if (isLoadingCases) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cases</h2>
            <p className="text-sm text-muted-foreground">{cases.length} total cases</p>
          </div>
          <Button onClick={() => router.push("/cases/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Case
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by case ID or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <label className="mb-2 block text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Funded">Funded</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Disputed">Disputed</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <label className="mb-2 block text-sm font-medium">Role</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Payer">Payer</SelectItem>
                    <SelectItem value="Payee">Payee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="gap-2 bg-transparent">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cases Table/List */}
        {filteredCases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold">No cases found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {hasActiveFilters ? "Try adjusting your filters" : "Get started by creating your first case"}
                </p>
                {!hasActiveFilters && (
                  <Button onClick={() => router.push("/cases/new")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Case
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <Card className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((caseItem) => {
                    const role = getUserRole(caseItem)
                    const counterparty = role === "Payer" ? caseItem.payeeAddress : caseItem.payerAddress
                    return (
                      <TableRow key={caseItem.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{caseItem.title || `Case #${caseItem.caseIdOnChain}`}</div>
                            <div className="text-xs text-muted-foreground">#{caseItem.caseIdOnChain}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={role} />
                        </TableCell>
                        <TableCell>
                          <AddressDisplay address={counterparty} />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold">{parseFloat(caseItem.amountEth || '0').toFixed(3)} ETH</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={caseItem.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/cases/${caseItem.caseIdOnChain}`)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
              {filteredCases.map((caseItem) => {
                const role = getUserRole(caseItem)
                return (
                  <Card key={caseItem.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{caseItem.title || `Case #${caseItem.caseIdOnChain}`}</CardTitle>
                          <div className="text-xs text-muted-foreground mt-1">#{caseItem.caseIdOnChain}</div>
                        </div>
                        <RoleBadge role={role} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Amount</span>
                        <span className="font-mono font-semibold">{parseFloat(caseItem.amountEth || '0').toFixed(3)} ETH</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <StatusBadge status={caseItem.status} />
                      </div>
                      <Button className="w-full" onClick={() => router.push(`/cases/${caseItem.caseIdOnChain}`)}>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
