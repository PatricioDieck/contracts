// hooks/use-case.ts
import { useQuery } from '@tanstack/react-query'
import type { Case, Deliverable, Artifact } from '@/db/schema'

interface CaseWithRelations {
  case: Case
  deliverables: Deliverable[]
  artifacts: Artifact[]
}

export function useCase(caseId: string | number) {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async (): Promise<CaseWithRelations> => {
      const res = await fetch(`/api/cases/${caseId}`)
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Case not found')
        }
        throw new Error('Failed to fetch case')
      }

      const data = await res.json()
      return data
    },
    enabled: !!caseId,
    staleTime: 10000, // Consider data fresh for 10 seconds
  })
}
