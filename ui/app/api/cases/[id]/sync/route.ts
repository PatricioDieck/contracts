// app/api/cases/[id]/sync/route.ts
// Syncs a single case from the blockchain to the database
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { cases } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createPublicClient, http, formatEther } from 'viem'
import { hardhat } from 'viem/chains'
import { ESCROW_ABI, ESCROW_ADDRESS } from '@/lib/escrow'

const STATUS_MAP: Record<number, 'Funded' | 'Submitted' | 'Disputed' | 'Resolved'> = {
  0: 'Funded',
  1: 'Submitted',
  2: 'Disputed',
  3: 'Resolved',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const caseIdOnChain = parseInt(id)

  if (isNaN(caseIdOnChain)) {
    return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 })
  }

  try {
    // Create a public client to read from the blockchain
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'),
    })

    // Read case data from the contract
    const caseData = await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'cases',
      args: [BigInt(caseIdOnChain)],
    }) as [string, string, string, bigint, `0x${string}`, `0x${string}`, bigint, number]

    const [payer, payee, judge, amount, specs, deliverables, reviewDeadline, statusNum] = caseData
    const status = STATUS_MAP[statusNum] || 'Funded'

    // Check if case exists in DB
    const [existingCase] = await db.select().from(cases)
      .where(eq(cases.caseIdOnChain, caseIdOnChain))
      .limit(1)

    const now = new Date()
    const updateData = {
      payerAddress: payer.toLowerCase(),
      payeeAddress: payee.toLowerCase(),
      judgeAddress: judge.toLowerCase(),
      amountEth: formatEther(amount),
      specsHash: specs,
      deliverablesHash: deliverables !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? deliverables : null,
      reviewDeadline: reviewDeadline > 0 ? new Date(Number(reviewDeadline) * 1000) : null,
      status,
      // Update timestamps based on status transitions
      submittedAt: (status === 'Submitted' || status === 'Disputed' || status === 'Resolved') 
        ? (existingCase?.submittedAt || now) 
        : null,
      disputedAt: (status === 'Disputed' || status === 'Resolved') 
        ? (existingCase?.disputedAt || now) 
        : null,
      resolvedAt: status === 'Resolved' 
        ? (existingCase?.resolvedAt || now) 
        : null,
    }

    if (existingCase) {
      // Update existing case
      await db.update(cases)
        .set(updateData)
        .where(eq(cases.caseIdOnChain, caseIdOnChain))
      
      return NextResponse.json({ 
        message: 'Case synced successfully',
        case: { ...existingCase, ...updateData }
      })
    } else {
      // Create new case (minimal data - title/description unknown)
      const [newCase] = await db.insert(cases).values({
        caseIdOnChain,
        title: `Case #${caseIdOnChain}`,
        ...updateData,
      }).returning()

      return NextResponse.json({ 
        message: 'Case created from chain',
        case: newCase
      })
    }
  } catch (error) {
    console.error('Error syncing case:', error)
    return NextResponse.json(
      { error: 'Failed to sync case from blockchain' },
      { status: 500 }
    )
  }
}
