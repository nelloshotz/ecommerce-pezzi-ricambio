import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Storico movimenti stock dettagliato
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione admin
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
    const productId = searchParams.get('productId')
    const type = searchParams.get('type') // PURCHASE, SALE, ADJUSTMENT, RETURN, DAMAGE
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0

    // Costruisci filtro where
    const where: any = {}

    if (productId) {
      where.productId = productId
    }

    if (type) {
      where.type = type
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Query movimenti
    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: skip,
      }),
      prisma.inventoryMovement.count({ where }),
    ])

    // Calcola statistiche aggregate
    const stats = await prisma.inventoryMovement.groupBy({
      by: ['type'],
      where,
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    })

    return NextResponse.json({
      movements: movements.map((movement) => ({
        id: movement.id,
        productId: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        quantityAfter: movement.quantityAfter,
        reason: movement.reason,
        orderId: movement.orderId,
        userId: movement.userId,
        createdAt: movement.createdAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
      filters: {
        productId: productId || null,
        type: type || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      statistics: stats.map((stat) => ({
        type: stat.type,
        totalQuantity: stat._sum.quantity || 0,
        count: stat._count.id,
      })),
    })
  } catch (error: any) {
    console.error('Errore nel recupero movimenti stock:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero movimenti stock', details: error.message },
      { status: 500 }
    )
  }
}

