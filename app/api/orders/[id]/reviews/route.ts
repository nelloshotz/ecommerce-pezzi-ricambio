import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// GET - Recupera recensione per ordine
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    const review = await prisma.review.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ review: null })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Errore nel recupero recensione:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero recensione' },
      { status: 500 }
    )
  }
}

// POST - Crea recensione per ordine
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()
    const { userId, rating, title, comment } = body

    if (!userId || !rating) {
      return NextResponse.json(
        { error: 'UserId e rating richiesti' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating deve essere tra 1 e 5' },
        { status: 400 }
      )
    }

    // Verifica che l'ordine esista e appartenga all'utente
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Ordine non trovato' },
        { status: 404 }
      )
    }

    if (order.userId !== userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Verifica che l'ordine sia stato consegnato
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Puoi recensire solo ordini consegnati' },
        { status: 400 }
      )
    }

    // Verifica se esiste già una recensione
    const existingReview = await prisma.review.findUnique({
      where: { orderId },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'Recensione già presente per questo ordine' },
        { status: 400 }
      )
    }

    // Crea recensione
    const review = await prisma.review.create({
      data: {
        orderId,
        userId,
        rating,
        title: title || null,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione recensione:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione recensione' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna recensione
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()
    const { userId, rating, title, comment } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'UserId richiesto' },
        { status: 400 }
      )
    }

    // Verifica che la recensione esista e appartenga all'utente
    const existingReview = await prisma.review.findUnique({
      where: { orderId },
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Recensione non trovata' },
        { status: 404 }
      )
    }

    if (existingReview.userId !== userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Aggiorna recensione
    const review = await prisma.review.update({
      where: { orderId },
      data: {
        ...(rating && { rating }),
        ...(title !== undefined && { title: title || null }),
        ...(comment !== undefined && { comment: comment || null }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Errore nell\'aggiornamento recensione:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento recensione' },
      { status: 500 }
    )
  }
}

