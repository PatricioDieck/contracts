import { cn } from "@/lib/utils"

export type CaseStatus = "Funded" | "Submitted" | "Disputed" | "Resolved"

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          status === "Funded" && "bg-blue-500",
          status === "Submitted" && "bg-amber-500",
          status === "Disputed" && "animate-pulse bg-red-500",
          status === "Resolved" && "bg-green-500",
        )}
      />
      <span
        className={cn(
          "text-xs font-medium",
          status === "Funded" && "text-blue-500",
          status === "Submitted" && "text-amber-500",
          status === "Disputed" && "text-red-500",
          status === "Resolved" && "text-green-500",
        )}
      >
        {status}
      </span>
    </div>
  )
}
