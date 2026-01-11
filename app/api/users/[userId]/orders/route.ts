import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                slug: true,
              },
            },
          },
        },
        shippingAddress: true,
        billingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel caricamento ordini:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento ordini' },
      { status: 500 }
    )
  }
}

