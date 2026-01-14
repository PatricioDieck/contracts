// app/api/deliverables/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { cases, deliverables } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const file = formData.get('file') as File | null
    const caseIdOnChain = formData.get('caseIdOnChain') as string | null
    const uploadedBy = formData.get('uploadedBy') as string | null

    if (!file || !caseIdOnChain || !uploadedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: file, caseIdOnChain, uploadedBy' },
        { status: 400 }
      )
    }

    // Find the case in the database
    const [caseRecord] = await db.select().from(cases)
      .where(eq(cases.caseIdOnChain, parseInt(caseIdOnChain)))
      .limit(1)

    if (!caseRecord) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Upload file to Vercel Blob
    const blob = await put(
      `deliverables/case-${caseIdOnChain}/${file.name}`,
      file,
      {
        access: 'public',
        contentType: file.type,
      }
    )

    // Save deliverable record to database
    const [deliverable] = await db.insert(deliverables).values({
      caseId: caseRecord.id,
      fileName: file.name,
      fileType: file.type,
      blobUrl: blob.url,
      fileSizeBytes: file.size,
      uploadedBy: uploadedBy.toLowerCase(),
    }).returning()

    return NextResponse.json({ deliverable }, { status: 201 })
  } catch (error) {
    console.error('Error uploading deliverable:', error)
    return NextResponse.json(
      { error: 'Failed to upload deliverable' },
      { status: 500 }
    )
  }
}
