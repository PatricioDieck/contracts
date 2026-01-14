"use client"

import type React from "react"
import { useState, useMemo } from "react"
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
import { useCases } from "@/hooks/use-cases"
import type { Case } from "@/db/schema"

function CaseSidebarItem({
  caseItem,
  isActive,
  onClick,
  currentAddress,
}: {
  caseItem: Case
  isActive: boolean
  onClick: () => void
  currentAddress?: string
}) {
  const role = currentAddress?.toLowerCase() === caseItem.payerAddress.toLowerCase() 
    ? "Payer" 
    : "Payee"
  const status = caseItem.status || 'Funded'
  const amountEth = parseFloat(caseItem.amountEth || '0')

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
          <div className="truncate font-medium">
            {caseItem.title || `Case #${caseItem.caseIdOnChain}`}
          </div>
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

  // Fetch cases from database via API
  const { data: cases = [], isLoading, error } = useCases()

  // Filter cases by status (using DB status strings)
  const activeCases = cases.filter((c) => 
    c.status === 'Funded' || c.status === 'Submitted' || c.status === 'Disputed'
  )
  const resolvedCases = cases.filter((c) => c.status === 'Resolved')

  // Memoize sidebar content to avoid creating component during render
  const sidebarContent = useMemo(() => (
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

        {/* Loading State */}
        {isLoading && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Loading cases...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="px-2 py-4 text-center text-sm text-red-500">
            Failed to load cases
          </div>
        )}

        {/* Active Cases */}
        {!isLoading && !error && (
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Active</div>
            {activeCases.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No active cases</div>
            ) : (
              activeCases.map((caseItem) => (
                <CaseSidebarItem
                  key={caseItem.id}
                  caseItem={caseItem}
                  isActive={pathname === `/cases/${caseItem.caseIdOnChain}`}
                  currentAddress={address}
                  onClick={() => {
                    router.push(`/cases/${caseItem.caseIdOnChain}`)
                    setSidebarOpen(false)
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Resolved Cases */}
        {!isLoading && !error && resolvedCases.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Resolved</div>
            {resolvedCases.map((caseItem) => (
              <CaseSidebarItem
                key={caseItem.id}
                caseItem={caseItem}
                isActive={pathname === `/cases/${caseItem.caseIdOnChain}`}
                currentAddress={address}
                onClick={() => {
                  router.push(`/cases/${caseItem.caseIdOnChain}`)
                  setSidebarOpen(false)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  ), [isLoading, error, activeCases, resolvedCases, pathname, address, router, setSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-80 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          {sidebarContent}
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
                  ? (() => {
                      // Extract case ID from pathname and find the case title
                      const caseIdMatch = pathname.match(/\/cases\/(\d+)/)
                      if (caseIdMatch) {
                        const caseIdOnChain = parseInt(caseIdMatch[1])
                        const currentCase = cases.find(c => c.caseIdOnChain === caseIdOnChain)
                        return currentCase?.title || `Case #${caseIdOnChain}`
                      }
                      return "Case Details"
                    })()
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
