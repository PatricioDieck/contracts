import { cn } from "@/lib/utils"

export type CaseStatus = "Funded" | "Submitted" | "Disputed" | "Resolved"

const statusConfig = {
  Funded: {
    bg: "bg-[#00d4ff]/10",
    text: "text-[#00d4ff]",
    dot: "bg-[#00d4ff]",
    glow: "shadow-[0_0_8px_rgba(0,212,255,0.4)]"
  },
  Submitted: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_8px_rgba(251,191,36,0.4)]"
  },
  Disputed: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-400 animate-pulse",
    glow: "shadow-[0_0_8px_rgba(248,113,113,0.4)]"
  },
  Resolved: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_8px_rgba(52,211,153,0.4)]"
  }
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  const config = statusConfig[status]
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-current/20",
      config.bg
    )}>
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.dot,
          config.glow
        )}
      />
      <span
        className={cn(
          "text-[10px] font-semibold tracking-wide uppercase",
          config.text
        )}
      >
        {status}
      </span>
    </div>
  )
}
