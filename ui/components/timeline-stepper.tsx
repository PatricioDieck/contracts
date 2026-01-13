import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CaseStatus } from "./status-badge"

const steps = [
  { id: "Funded", label: "Funded" },
  { id: "Submitted", label: "Submitted" },
  { id: "Disputed", label: "Disputed" },
  { id: "Resolved", label: "Resolved" },
]

export function TimelineStepper({ currentStatus }: { currentStatus: CaseStatus }) {
  const currentIndex = steps.findIndex((s) => s.id === currentStatus)

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isComplete && "border-green-500 bg-green-500 text-white",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  !isComplete && !isCurrent && "border-muted bg-background text-muted-foreground",
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 px-2 flex items-center">
                <div className={cn("h-0.5 w-full transition-colors", isComplete ? "bg-green-500" : "bg-muted")} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
