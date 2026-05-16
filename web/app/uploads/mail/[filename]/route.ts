import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  // Use absolute path resolution for local dev if UPLOAD_DIR is not set
  const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '../smtp-service/attachments')
  const filePath = path.join(UPLOAD_DIR, filename)

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  
  // Basic content type detection based on extension
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: { [key: string]: string } = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
  }
  
  const contentType = mimeTypes[ext] || 'application/octet-stream'

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
