import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Recupera offerta attiva per un prodotto (pubblico)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const now = new Date()

    // Cerca offerta attiva e non scaduta
    const offer = await prisma.productOffer.findFirst({
      where: {
        productId: id,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!offer) {
      return NextResponse.json({ offer: null }, { status: 200 })
    }

    return NextResponse.json(
      {
        offer: {
          id: offer.id,
          discountPercent: offer.discountPercent,
          startDate: offer.startDate.toISOString(),
          endDate: offer.endDate.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero offerta attiva:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero offerta attiva', details: error.message },
      { status: 500 }
    )
  }
}

