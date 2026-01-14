// app/api/cases/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { cases, deliverables, artifacts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const caseId = parseInt(id)

  if (isNaN(caseId)) {
    return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 })
  }

  try {
    // Fetch case by caseIdOnChain (the on-chain ID)
    const [caseData] = await db.select().from(cases)
      .where(eq(cases.caseIdOnChain, caseId))
      .limit(1)

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch related data
    const [caseDeliverables, caseArtifacts] = await Promise.all([
      db.select().from(deliverables).where(eq(deliverables.caseId, caseData.id)),
      db.select().from(artifacts).where(eq(artifacts.caseId, caseData.id)),
    ])

    return NextResponse.json({
      case: caseData,
      deliverables: caseDeliverables,
      artifacts: caseArtifacts,
    })
  } catch (error) {
    console.error('Error fetching case:', error)
    return NextResponse.json({ error: 'Failed to fetch case' }, { status: 500 })
  }
}
