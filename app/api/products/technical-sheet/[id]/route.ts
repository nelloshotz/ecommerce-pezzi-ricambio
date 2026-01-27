import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET - Recupera scheda tecnica prodotto dal database
 * L'ID può essere il productId o un nome file virtuale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Cerca il prodotto per ID o per nome file virtuale nell'URL technicalSheet
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { technicalSheet: { contains: id } },
        ],
      },
      select: {
        id: true,
        technicalSheetData: true,
        technicalSheet: true,
      },
    })

    if (!product || !product.technicalSheetData) {
      return NextResponse.json(
        { error: 'Scheda tecnica non trovata' },
        { status: 404 }
      )
    }

    // Estrai i dati base64 (rimuovi il prefisso data:application/pdf;base64,)
    const base64Match = product.technicalSheetData.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Formato scheda tecnica non valido' },
        { status: 400 }
      )
    }

    const mimeType = base64Match[1]
    const base64Data = base64Match[2]

    // Converti base64 in buffer
    const pdfBuffer = Buffer.from(base64Data, 'base64')

    // Restituisci il PDF con il Content-Type corretto
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="scheda-tecnica-${product.id}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Errore nel recupero scheda tecnica:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero scheda tecnica' },
      { status: 500 }
    )
  }
}

