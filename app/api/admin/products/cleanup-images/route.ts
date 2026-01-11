import { NextRequest, NextResponse } from 'next/server'
import { findUnusedImages } from '@/lib/imageProcessing'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'

// POST - Elimina immagini non utilizzate
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    // Trova immagini non utilizzate
    const unusedFiles = await findUnusedImages()

    if (unusedFiles.length === 0) {
      return NextResponse.json({
        message: 'Nessuna immagine non utilizzata trovata',
        deleted: 0,
        files: [],
      })
    }

    // Elimina file
    const deletedFiles: string[] = []
    const errors: Array<{ file: string; error: string }> = []

    for (const filePath of unusedFiles) {
      try {
        if (existsSync(filePath)) {
          await unlink(filePath)
          deletedFiles.push(filePath)
        }
      } catch (error: any) {
        errors.push({
          file: filePath,
          error: error.message || 'Errore sconosciuto',
        })
      }
    }

    return NextResponse.json({
      message: `Eliminati ${deletedFiles.length} file non utilizzati`,
      deleted: deletedFiles.length,
      total: unusedFiles.length,
      files: deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Errore nella pulizia immagini:', error)
    return NextResponse.json(
      { error: 'Errore nella pulizia immagini', details: error.message },
      { status: 500 }
    )
  }
}

