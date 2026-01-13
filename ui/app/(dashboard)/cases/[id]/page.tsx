"use client"

import { useParams } from "next/navigation"
import { CaseDetailView } from "@/components/case-detail-view"

export default function CaseDetailPage() {
  const params = useParams()
  const caseId = params.id as string

  return <CaseDetailView caseId={caseId} />
}
