import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateOrderStatus } from '@/lib/orderStatus'

// GET - Recupera tutti gli ordini (con calcolo automatico stato "In Ritardo", paginazione e ordinamento)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Recupera tutti gli ordini (senza paginazione per ordinamento personalizzato)
    const allOrders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calcola stato automatico per ogni ordine (gestione "In Ritardo")
    const ordersWithCalculatedStatus = allOrders.map((order) => {
      const calculatedStatus = calculateOrderStatus(order)
      
      // Se lo stato calcolato è diverso da quello salvato, aggiornalo nel DB
      if (calculatedStatus !== order.status) {
        // Aggiorna in background (non aspettiamo)
        prisma.order
          .update({
            where: { id: order.id },
            data: { status: calculatedStatus },
          })
          .catch(console.error)
        
        return { ...order, status: calculatedStatus }
      }
      
      return order
    })

    // Ordinamento personalizzato: ordini "inevasi" (non consegnati/annullati/rimborsati) prima, poi per data
    const sortedOrders = ordersWithCalculatedStatus.sort((a, b) => {
      // Ordini "inevasi" sono quelli che non sono DELIVERED, CANCELLED, REFUNDED
      const aIsUnfulfilled = !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(a.status)
      const bIsUnfulfilled = !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(b.status)

      // Se uno è inevaso e l'altro no, l'inevaso viene prima
      if (aIsUnfulfilled && !bIsUnfulfilled) return -1
      if (!aIsUnfulfilled && bIsUnfulfilled) return 1

      // Se entrambi hanno lo stesso stato (inevasi o evasi), ordina per data (più recenti prima)
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Ordine decrescente (più recenti prima)
    })

    // Paginazione
    const totalOrders = sortedOrders.length
    const totalPages = Math.ceil(totalOrders / limit)
    const paginatedOrders = sortedOrders.slice(skip, skip + limit)

    // Recupera il conteggio dei messaggi non letti per admin per tutti gli ordini paginati in una singola query
    const orderIds = paginatedOrders.map(order => order.id)
    const unreadCounts = await prisma.orderMessage.groupBy({
      by: ['orderId'],
      where: {
        orderId: { in: orderIds },
        isReadByAdmin: false,
        // Solo messaggi inviati dagli utenti (non dall'admin)
        adminId: null,
      },
      _count: {
        id: true,
      },
    })

    // Crea una mappa per accesso rapido
    const unreadCountMap = new Map(
      unreadCounts.map(item => [item.orderId, item._count.id])
    )

    // Aggiungi il conteggio ai relativi ordini
    const ordersWithUnreadCount = paginatedOrders.map(order => ({
      ...order,
      unreadMessagesCount: unreadCountMap.get(order.id) || 0,
    }))

    return NextResponse.json({
      orders: ordersWithUnreadCount,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Errore nel recupero ordini:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero ordini' },
      { status: 500 }
    )
  }
}

