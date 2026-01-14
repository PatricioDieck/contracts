// app/api/cases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { cases, NewCase } from '@/db/schema'
import { eq, or, and, desc } from 'drizzle-orm'
import { put } from '@vercel/blob'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  const status = searchParams.get('status') // optional filter

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
  }

  try {
    // Build conditions array
    const conditions = [
      or(
        eq(cases.payerAddress, wallet.toLowerCase()),
        eq(cases.payeeAddress, wallet.toLowerCase())
      )
    ]

    // Add status filter if provided
    if (status && status !== 'all') {
      conditions.push(eq(cases.status, status as 'Funded' | 'Submitted' | 'Disputed' | 'Resolved'))
    }

    // Combine all conditions with AND
    const userCases = await db.select().from(cases)
      .where(and(...conditions))
      .orderBy(desc(cases.createdAt)) // Most recent first

    return NextResponse.json({ cases: userCases })
  } catch (error) {
    console.error('Error fetching cases:', error)
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 })
  }
}

// Create a new case in the database after on-chain creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      caseIdOnChain,
      payerAddress,
      payeeAddress,
      judgeAddress,
      title,
      description,
      amountEth,
      specsHash,
      specsText,
    } = body

    // Validate required fields
    if (caseIdOnChain === undefined || !payerAddress || !payeeAddress || !judgeAddress || !title || !amountEth || !specsHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Optional: Upload specs text to blob storage
    let specsBlobUrl: string | null = null
    if (specsText) {
      const blob = await put(`specs/case-${caseIdOnChain}.txt`, specsText, {
        access: 'public',
        contentType: 'text/plain',
      })
      specsBlobUrl = blob.url
    }

    // Create the case in the database
    const newCase: NewCase = {
      caseIdOnChain,
      payerAddress: payerAddress.toLowerCase(),
      payeeAddress: payeeAddress.toLowerCase(),
      judgeAddress: judgeAddress.toLowerCase(),
      title,
      description: description || null,
      amountEth: amountEth.toString(),
      status: 'Funded',
      specsHash,
      specsBlobUrl,
    }

    const [inserted] = await db.insert(cases).values(newCase).returning()

    return NextResponse.json({ case: inserted }, { status: 201 })
  } catch (error) {
    console.error('Error creating case:', error)
    
    // Handle unique constraint violation (case already exists)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Case already exists in database' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create case' },
      { status: 500 }
    )
  }
}