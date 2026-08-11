import { db } from '@/lib/db'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// ========== GET: List files ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    const files = await db.projectFile.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: files })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    )
  }
}

// ========== POST: Upload file (metadata only for demo) ==========
const uploadFileSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = uploadFileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { projectId, userId, fileName, fileSize, mimeType } = parsed.data

    // Check project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // For demo, generate a mock file path
    const filePath = `/uploads/${projectId}/${Date.now()}-${fileName}`

    // Create file record (in production, handle actual file upload)
    const file = await db.projectFile.create({
      data: {
        projectId,
        fileName,
        filePath,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        uploadedBy: userId,
      },
    })

    // Log activity
    await db.activityLog.create({
      data: {
        projectId,
        userId,
        action: 'file_uploaded',
        description: `Uploaded file "${fileName}"`,
        metadata: JSON.stringify({ fileId: file.id, fileSize, mimeType }),
      },
    })

    return NextResponse.json(
      { data: file, message: 'File metadata saved successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload file error:', error)
    return NextResponse.json(
      { error: 'Failed to save file metadata' },
      { status: 500 }
    )
  }
}
