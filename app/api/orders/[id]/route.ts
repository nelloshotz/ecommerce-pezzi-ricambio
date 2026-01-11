import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                slug: true,
                brand: true,
                partNumber: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Ordine non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel caricamento ordine:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento ordine' },
      { status: 500 }
    )
  }
}

