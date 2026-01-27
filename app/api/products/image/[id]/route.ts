import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET - Recupera immagine prodotto dal database
 * L'ID può essere il productId o un nome file virtuale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Cerca il prodotto per ID o per nome file virtuale nell'URL image
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { image: { contains: id } },
        ],
      },
      select: {
        id: true,
        imageData: true,
        image: true,
      },
    })

    if (!product || !product.imageData) {
      // Se non trovato, restituisci placeholder
      return NextResponse.redirect(new URL('/images/placeholder.svg', request.url))
    }

    // Estrai i dati base64 (rimuovi il prefisso data:image/...;base64,)
    const base64Match = product.imageData.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) {
      return NextResponse.redirect(new URL('/images/placeholder.svg', request.url))
    }

    const mimeType = base64Match[1]
    const base64Data = base64Match[2]

    // Converti base64 in buffer
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Restituisci l'immagine con il Content-Type corretto
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Errore nel recupero immagine:', error)
    return NextResponse.redirect(new URL('/images/placeholder.svg', request.url))
  }
}

