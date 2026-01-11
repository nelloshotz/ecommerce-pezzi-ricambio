import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateShipping } from '@/lib/shipping-calculator'

// POST - Calcola costo spedizione per un carrello
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { items, subtotal } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Carrello vuoto' },
        { status: 400 }
      )
    }

    // Recupera informazioni complete dei prodotti (dimensioni e peso)
    const productsWithDimensions = []
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          height: true,
          width: true,
          depth: true,
          weight: true,
          active: true,
          inStock: true,
          stockQuantity: true,
        },
      })

      if (!product || !product.active || !product.inStock) {
        return NextResponse.json(
          { error: `Prodotto ${product?.name || item.productId} non disponibile` },
          { status: 400 }
        )
      }

      if (item.quantity > product.stockQuantity) {
        return NextResponse.json(
          { error: `Quantità non disponibile per ${product.name}. Disponibili solo ${product.stockQuantity} pezzi.` },
          { status: 400 }
        )
      }

      productsWithDimensions.push({
        id: product.id,
        height: product.height,
        width: product.width,
        depth: product.depth,
        weight: product.weight,
        quantity: item.quantity,
        name: product.name,
      })
    }

    // Calcola subtotale se non fornito
    let calculatedSubtotal = subtotal
    if (calculatedSubtotal === undefined) {
      calculatedSubtotal = 0
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { price: true },
        })
        if (product) {
          calculatedSubtotal += product.price * item.quantity
        }
      }
    }

    // Calcola spedizione (con gestione multipli colli e soglia gratuita)
    const shippingCalculation = await calculateShipping(productsWithDimensions, calculatedSubtotal)

    // Costruisci messaggio in base al numero di colli e spedizione gratuita
    let message = shippingCalculation.isFreeShipping
      ? '🎉 Spedizione Gratuita!'
      : `Spedito con ${shippingCalculation.carrier}`
    if (shippingCalculation.totalPackages && shippingCalculation.totalPackages > 1 && !shippingCalculation.isFreeShipping) {
      message = `${shippingCalculation.totalPackages} colli - Spedito con ${shippingCalculation.carrier}`
    }

    return NextResponse.json(
      {
        carrier: shippingCalculation.carrier,
        baseCost: shippingCalculation.baseCost,
        finalCost: shippingCalculation.finalCost,
        markupPercent: shippingCalculation.markupPercent,
        format: shippingCalculation.format,
        packages: shippingCalculation.packages || [],
        totalPackages: shippingCalculation.totalPackages || 1,
        isFreeShipping: shippingCalculation.isFreeShipping || false,
        freeShippingThreshold: shippingCalculation.freeShippingThreshold,
        message,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel calcolo spedizione:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nel calcolo spedizione' },
      { status: 500 }
    )
  }
}

