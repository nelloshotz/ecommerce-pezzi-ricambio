import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Recupera tutte le offerte di un prodotto (incluse scadute)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    const { id } = params

    const offers = await prisma.productOffer.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      {
        offers: offers.map((offer) => ({
          id: offer.id,
          discountPercent: offer.discountPercent,
          startDate: offer.startDate.toISOString(),
          endDate: offer.endDate.toISOString(),
          isActive: offer.isActive,
          createdAt: offer.createdAt.toISOString(),
          updatedAt: offer.updatedAt.toISOString(),
        })),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero offerte:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero offerte', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Crea una nuova offerta per un prodotto
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { discountPercent, endDate } = body

    // Validazione
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Percentuale di sconto deve essere tra 1 e 100' },
        { status: 400 }
      )
    }

    if (!endDate) {
      return NextResponse.json(
        { error: 'Data di fine offerta obbligatoria' },
        { status: 400 }
      )
    }

    const endDateObj = new Date(endDate)
    if (isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Data di fine offerta non valida' },
        { status: 400 }
      )
    }

    // Verifica che il prodotto esista
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    // Disattiva tutte le offerte attive esistenti per questo prodotto
    await prisma.productOffer.updateMany({
      where: {
        productId: id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    // Crea nuova offerta
    const offer = await prisma.productOffer.create({
      data: {
        productId: id,
        discountPercent: parseFloat(String(discountPercent)),
        startDate: new Date(),
        endDate: endDateObj,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        offer: {
          id: offer.id,
          discountPercent: offer.discountPercent,
          startDate: offer.startDate.toISOString(),
          endDate: offer.endDate.toISOString(),
          isActive: offer.isActive,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Errore nella creazione offerta:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione offerta', details: error.message },
      { status: 500 }
    )
  }
}

