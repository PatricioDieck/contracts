import { Badge } from "@/components/ui/badge"

export function RoleBadge({ role }: { role: "Payer" | "Payee" }) {
  return (
    <Badge variant={role === "Payer" ? "default" : "secondary"} className="text-xs">
      {role}
    </Badge>
  )
}
