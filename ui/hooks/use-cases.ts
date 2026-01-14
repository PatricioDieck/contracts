// hooks/use-cases.ts
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import type { Case } from '@/db/schema'

export function useCases() {
  const { address } = useAccount()

  return useQuery({
    queryKey: ['cases', address], // Simple key: just wallet address
    queryFn: async (): Promise<Case[]> => {
      if (!address) throw new Error('Wallet not connected')

      // Simple fetch to API
      const res = await fetch(`/api/cases?wallet=${address}`)
      if (!res.ok) {
        throw new Error('Failed to fetch cases')
      }

      const data = await res.json()
      return data.cases || []
    },
    enabled: !!address, // Only fetch when wallet connected
  })
}