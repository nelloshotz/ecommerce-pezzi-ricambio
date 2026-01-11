import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Aggiorna immagine (imposta principale, ordine, ecc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

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

    const productId = params.id
    const imageId = params.imageId

    const body = await request.json()
    const { isPrimary, sortOrder } = body

    // Verifica immagine esiste e appartiene al prodotto
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    })

    if (!image || image.productId !== productId) {
      return NextResponse.json(
        { error: 'Immagine non trovata' },
        { status: 404 }
      )
    }

    // Se stiamo impostando come principale, rimuovi il flag dalle altre
    if (isPrimary === true) {
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true, id: { not: imageId } },
        data: { isPrimary: false },
      })

      // Aggiorna anche il campo image del prodotto (legacy)
      await prisma.product.update({
        where: { id: productId },
        data: { image: image.imageUrl },
      })
    }

    // Aggiorna immagine
    const updatedImage = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(isPrimary !== undefined && { isPrimary }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({
      message: 'Immagine aggiornata con successo',
      image: updatedImage,
    })
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento immagine:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento immagine', details: error.message },
      { status: 500 }
    )
  }
}

