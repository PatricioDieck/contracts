"use client"

import type React from "react"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Plus, Search, Scale } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/status-badge"
import { RoleBadge } from "@/components/role-badge"
import { cn } from "@/lib/utils"
import { useReadContract, useReadContracts } from "wagmi"
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/lib/escrow"
import { useMemo } from "react"

interface CaseSummary {
  id: number
  payer: string
  payee: string
  status: number
  amount: bigint
}

function CaseSidebarItem({
  caseItem,
  isActive,
  onClick,
  currentAddress,
}: {
  caseItem: CaseSummary
  isActive: boolean
  onClick: () => void
  currentAddress?: string
}) {
  const role = currentAddress?.toLowerCase() === caseItem.payer.toLowerCase() ? "Payer" : "Payee"
  const statusMap: Record<number, "Funded" | "Submitted" | "Disputed" | "Resolved"> = {
    0: "Funded",
    1: "Submitted",
    2: "Disputed",
    3: "Resolved",
  }
  const status = statusMap[caseItem.status] || "Funded"
  const amountEth = Number(caseItem.amount) / 1e18

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg p-3 text-left transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">Case #{caseItem.id}</div>
        </div>
        <RoleBadge role={role} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{amountEth.toFixed(3)} ETH</span>
        <StatusBadge status={status} />
      </div>
    </button>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { address } = useAccount()

  // Fetch cases from contract
  const { data: nextCaseId } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "nextCaseId",
  })

  const caseIds = useMemo(() => {
    const n = Number(nextCaseId ?? 0n)
    return n > 0 ? Array.from({ length: n }, (_, i) => BigInt(i)) : []
  }, [nextCaseId])

  const { data: casesData } = useReadContracts({
    contracts: caseIds.map((id) => ({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "cases",
      args: [id],
    })),
    allowFailure: true,
  })

  // Transform cases data
  const cases: CaseSummary[] = useMemo(() => {
    if (!casesData) return []
    return casesData
      .map((result, idx) => {
        if (result.status !== "success" || !result.result) return null
        const raw = result.result as readonly unknown[]
        return {
          id: idx,
          payer: raw[0] as string,
          payee: raw[1] as string,
          status: Number(raw[7] ?? 0),
          amount: raw[3] as bigint,
        }
      })
      .filter((c): c is CaseSummary => c !== null)
  }, [casesData])

  const activeCases = cases.filter((c) => [0, 1, 2].includes(c.status))
  const resolvedCases = cases.filter((c) => c.status === 3)

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <Scale className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-semibold text-sidebar-foreground">ARBITRATION</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {/* New Case Button */}
        <Button
          onClick={() => {
            router.push("/cases/new")
            setSidebarOpen(false)
          }}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          New Case
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search cases..." className="pl-9" />
        </div>

        {/* Active Cases */}
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Active</div>
          {activeCases.map((caseItem) => (
            <CaseSidebarItem
              key={caseItem.id}
              caseItem={caseItem}
              isActive={pathname === `/cases/${caseItem.id}`}
              currentAddress={address}
              onClick={() => {
                router.push(`/cases/${caseItem.id}`)
                setSidebarOpen(false)
              }}
            />
          ))}
        </div>

        {/* Resolved Cases */}
        {resolvedCases.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Resolved</div>
            {resolvedCases.map((caseItem) => (
              <CaseSidebarItem
                key={caseItem.id}
                caseItem={caseItem}
                isActive={pathname === `/cases/${caseItem.id}`}
                currentAddress={address}
                onClick={() => {
                  router.push(`/cases/${caseItem.id}`)
                  setSidebarOpen(false)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-80 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <h1 className="text-xl font-semibold">
              {pathname === "/cases/new"
                ? "New Case"
                : pathname.startsWith("/cases/") && pathname !== "/cases/new"
                  ? "Case Details"
                  : "Cases"}
            </h1>
          </div>
          <ConnectButton />
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
