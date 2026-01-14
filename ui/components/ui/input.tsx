import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border bg-[#0d1320] px-3 py-1 text-sm text-white transition-all duration-200 outline-none",
        "border-[#00d4ff]/20 placeholder:text-gray-500",
        "focus:border-[#00d4ff]/50 focus:ring-2 focus:ring-[#00d4ff]/20 focus:bg-[#0d1320]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:text-[#00d4ff] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
