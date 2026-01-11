import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processImage, deleteImageFiles } from '@/lib/imageProcessing'

// GET - Ottieni tutte le immagini di un prodotto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verifica prodotto esiste
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, image: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    // Recupera immagini multiple
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      images,
      mainImage: product.image, // Immagine principale legacy
    })
  } catch (error: any) {
    console.error('Errore nel recupero immagini prodotto:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero immagini', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Aggiungi una o più immagini a un prodotto
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Verifica prodotto esiste
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const isPrimaryStr = formData.get('isPrimary') as string | null

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna immagine fornita' },
        { status: 400 }
      )
    }

    const isPrimary = isPrimaryStr === 'true'

    // Verifica che ci sia solo un'immagine principale
    let shouldSetPrimary = isPrimary
    if (shouldSetPrimary) {
      // Se stiamo impostando questa come principale, rimuovi il flag principale dalle altre
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const uploadedImages = []

    // Processa ogni immagine
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Verifica tipo file
      if (!file.type.startsWith('image/')) {
        continue // Salta file non validi
      }

      // Verifica dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        continue // Salta file troppo grandi
      }

      try {
        // Processa immagine (resize, thumbnail, WebP)
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const processed = await processImage(buffer, file.name, {
          maxWidth: 1200,
          maxHeight: 1200,
          thumbnailSize: 300,
          quality: 85,
          generateWebP: true,
          generateThumbnail: true,
        })

        // Determina se questa è l'immagine principale
        const isPrimaryImage = shouldSetPrimary && i === 0

        // Se è la prima immagine e non ci sono altre immagini principali, rendila principale
        const existingImages = await prisma.productImage.findMany({
          where: { productId },
        })
        const hasPrimaryImage = existingImages.some((img) => img.isPrimary)
        const shouldBePrimary = isPrimaryImage || (!hasPrimaryImage && i === 0)

        // Crea record ProductImage
        const productImage = await prisma.productImage.create({
          data: {
            productId,
            imageUrl: processed.originalUrl,
            thumbnailUrl: processed.thumbnailUrl || null,
            webpUrl: processed.webpUrl || null,
            width: processed.width,
            height: processed.height,
            fileSize: processed.fileSize,
            isPrimary: shouldBePrimary,
            sortOrder: existingImages.length + i,
          },
        })

        uploadedImages.push(productImage)

        // Se è l'immagine principale, aggiorna anche il campo image del prodotto (legacy)
        if (shouldBePrimary) {
          await prisma.product.update({
            where: { id: productId },
            data: { image: processed.originalUrl },
          })
        }
      } catch (error: any) {
        console.error(`Errore nel processamento immagine ${i + 1}:`, error)
        // Continua con le altre immagini
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna immagine valida processata' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `${uploadedImages.length} immagine/i aggiunta/e con successo`,
      images: uploadedImages,
    })
  } catch (error: any) {
    console.error('Errore nell\'upload immagini:', error)
    return NextResponse.json(
      { error: 'Errore nell\'upload immagini', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Elimina un'immagine
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId richiesto' },
        { status: 400 }
      )
    }

    const productId = params.id

    // Recupera immagine
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    })

    if (!image || image.productId !== productId) {
      return NextResponse.json(
        { error: 'Immagine non trovata' },
        { status: 404 }
      )
    }

    const wasPrimary = image.isPrimary

    // Elimina file dal filesystem
    await deleteImageFiles({
      imageUrl: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl,
      webpUrl: image.webpUrl,
    })

    // Elimina record dal database
    await prisma.productImage.delete({
      where: { id: imageId },
    })

    // Se era l'immagine principale, imposta un'altra come principale o usa placeholder
    if (wasPrimary) {
      const remainingImages = await prisma.productImage.findMany({
        where: { productId },
        orderBy: { createdAt: 'asc' },
        take: 1,
      })

      if (remainingImages.length > 0) {
        // Imposta la prima disponibile come principale
        await prisma.productImage.update({
          where: { id: remainingImages[0].id },
          data: { isPrimary: true },
        })
        await prisma.product.update({
          where: { id: productId },
          data: { image: remainingImages[0].imageUrl },
        })
      } else {
        // Nessuna immagine rimasta, usa placeholder
        await prisma.product.update({
          where: { id: productId },
          data: { image: '/images/placeholder.svg' },
        })
      }
    }

    return NextResponse.json({
      message: 'Immagine eliminata con successo',
    })
  } catch (error: any) {
    console.error('Errore nell\'eliminazione immagine:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione immagine', details: error.message },
      { status: 500 }
    )
  }
}

