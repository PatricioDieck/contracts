"use client"

import type React from "react"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Plus, Search, Zap } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
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
        "w-full rounded-lg p-3 text-left transition-all duration-200 border",
        isActive
          ? "bg-[#00d4ff]/10 border-[#00d4ff]/30 text-white"
          : "border-transparent text-gray-300 hover:bg-[#00d4ff]/5 hover:border-[#00d4ff]/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">
            {caseItem.title || `Case #${caseItem.caseIdOnChain}`}
          </div>
        </div>
        <RoleBadge role={role} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-[#00d4ff]">{amountEth.toFixed(3)} ETH</span>
        <StatusBadge status={status} />
      </div>
    </button>
  )
}

// Animated network nodes background
function NetworkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Radial glow effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#00d4ff]/3 rounded-full blur-2xl translate-x-1/3 translate-y-1/3" />
      
      {/* Grid lines */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Floating dots */}
      <div className="absolute top-20 left-10 w-1.5 h-1.5 bg-[#00d4ff]/40 rounded-full animate-pulse" />
      <div className="absolute top-40 left-32 w-1 h-1 bg-[#00d4ff]/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-32 left-20 w-2 h-2 bg-[#00d4ff]/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 right-20 w-1.5 h-1.5 bg-[#00d4ff]/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
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

  const sidebarContent = (
    <div className="flex h-full flex-col relative">
      <NetworkBackground />
      
      {/* Brand */}
      <div className="relative flex h-16 items-center gap-2.5 border-b border-[#00d4ff]/10 px-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30">
          <Zap className="h-4 w-4 text-[#00d4ff]" />
        </div>
        <span className="font-display text-lg font-semibold tracking-[0.2em] text-white">JUDGE</span>
      </div>

      <div className="relative flex flex-1 flex-col gap-4 overflow-auto p-4">
        {/* New Case Button */}
        <Button
          onClick={() => {
            router.push("/cases/new")
            setSidebarOpen(false)
          }}
          className="w-full gap-2 bg-[#00d4ff] text-[#080c14] hover:bg-[#00d4ff]/90 font-semibold tracking-wide"
        >
          <Plus className="h-4 w-4" />
          NEW CASE
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00d4ff]/50" />
          <Input 
            placeholder="Search cases..." 
            className="pl-9 bg-[#00d4ff]/5 border-[#00d4ff]/20 placeholder:text-gray-500 focus:border-[#00d4ff]/40 focus:ring-[#00d4ff]/20" 
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-2 py-4 text-center text-sm text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-pulse" />
              <span>Loading cases...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="px-2 py-4 text-center text-sm text-red-400">
            Failed to load cases
          </div>
        )}

        {/* Active Cases */}
        {!isLoading && !error && (
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.15em] text-[#00d4ff]/70 uppercase">Active</div>
            {activeCases.length === 0 ? (
              <div className="px-2 py-2 text-xs text-gray-500">No active cases</div>
            ) : (
              activeCases.map((caseItem, index) => (
                <div 
                  key={caseItem.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CaseSidebarItem
                    caseItem={caseItem}
                    isActive={pathname === `/cases/${caseItem.caseIdOnChain}`}
                    currentAddress={address}
                    onClick={() => {
                      router.push(`/cases/${caseItem.caseIdOnChain}`)
                      setSidebarOpen(false)
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {/* Resolved Cases */}
        {!isLoading && !error && resolvedCases.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">Resolved</div>
            {resolvedCases.map((caseItem, index) => (
              <div 
                key={caseItem.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${(activeCases.length + index) * 50}ms` }}
              >
                <CaseSidebarItem
                  caseItem={caseItem}
                  isActive={pathname === `/cases/${caseItem.caseIdOnChain}`}
                  currentAddress={address}
                  onClick={() => {
                    router.push(`/cases/${caseItem.caseIdOnChain}`)
                    setSidebarOpen(false)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#080c14]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-80 border-r border-[#00d4ff]/10 bg-[#0a1018] lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0 bg-[#0a1018] border-[#00d4ff]/10">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#00d4ff]/10 bg-[#0a1018]/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-gray-400 hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-semibold tracking-wide text-white">
              {pathname === "/cases/new"
                ? "NEW CASE"
                : pathname.startsWith("/cases/") && pathname !== "/cases/new"
                  ? (() => {
                      const caseIdMatch = pathname.match(/\/cases\/(\d+)/)
                      if (caseIdMatch) {
                        const caseIdOnChain = parseInt(caseIdMatch[1])
                        const currentCase = cases.find(c => c.caseIdOnChain === caseIdOnChain)
                        return currentCase?.title?.toUpperCase() || `CASE #${caseIdOnChain}`
                      }
                      return "CASE DETAILS"
                    })()
                  : "CASES"}
            </h1>
          </div>
          <ConnectButton />
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-[#080c14] relative">
          <div className="absolute inset-0 grid-overlay pointer-events-none" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  )
}
