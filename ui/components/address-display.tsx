"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AddressDisplay({
  address,
  isCurrentUser = false,
}: {
  address: string
  isCurrentUser?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{shortenAddress(address)}</code>
      {isCurrentUser && (
        <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">You</span>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyToClipboard}>
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
