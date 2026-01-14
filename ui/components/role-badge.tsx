import { cn } from "@/lib/utils"

export function RoleBadge({ role }: { role: "Payer" | "Payee" }) {
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border",
        role === "Payer" 
          ? "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30" 
          : "bg-purple-500/10 text-purple-400 border-purple-500/30"
      )}
    >
      {role}
    </span>
  )
}
