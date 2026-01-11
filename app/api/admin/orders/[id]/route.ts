import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateOrderStatus, getStatusAfterTrackingInsert, getStatusAfterDelivery } from '@/lib/orderStatus'

// GET - Recupera singolo ordine
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Ordine non trovato' },
        { status: 404 }
      )
    }

    // Calcola stato automatico
    const calculatedStatus = calculateOrderStatus(order)
    if (calculatedStatus !== order.status) {
      // Aggiorna stato nel DB
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: calculatedStatus },
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
      })
      return NextResponse.json(updatedOrder)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Errore nel recupero ordine:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero ordine' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna ordine (stato, tracking, note, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()
    const { status, trackingNumber, notes, paymentStatus, markAsDelivered, shippingCarrier } = body

    // Verifica che l'ordine esista
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordine non trovato' },
        { status: 404 }
      )
    }

    // Prepara dati per aggiornamento
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Aggiorna stato se fornito
    if (status) {
      updateData.status = status as string
      
      // Se stato è SHIPPED e viene inserito tracking, imposta shippedAt
      if (status === 'SHIPPED' && trackingNumber && !existingOrder.shippedAt) {
        updateData.shippedAt = new Date()
      }
      
      // Se stato è DELIVERED, imposta deliveredAt
      if (status === 'DELIVERED' && !existingOrder.deliveredAt) {
        updateData.deliveredAt = new Date()
      }
    }

    // Aggiorna tracking number se fornito
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null
      
      // Se viene inserito tracking e ordine non è ancora spedito, aggiorna stato
      if (trackingNumber && trackingNumber.trim() !== '' && existingOrder.status !== 'SHIPPED' && existingOrder.status !== 'DELIVERED') {
        updateData.status = getStatusAfterTrackingInsert()
        updateData.shippedAt = new Date()
      }
      
      // Se tracking viene rimosso e stato era SHIPPED, potrebbe essere necessario regolare
      if (!trackingNumber && existingOrder.status === 'SHIPPED') {
        // Potremmo voler mantenere SHIPPED o tornare a CONFIRMED, per ora manteniamo
      }
    }

    // Marca come consegnato se richiesto
    if (markAsDelivered) {
      updateData.status = getStatusAfterDelivery()
      updateData.deliveredAt = new Date()
    }

    // Aggiorna note se fornite
    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    // Aggiorna payment status se fornito
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus
      
      // Se pagamento diventa PAID e stato è ancora PENDING, aggiorna a CONFIRMED
      if (paymentStatus === 'PAID' && existingOrder.status === 'PENDING') {
        updateData.status = 'CONFIRMED'
        updateData.confirmedAt = new Date()
      }
    }

    // Aggiorna nome corriere se fornito
    if (shippingCarrier !== undefined) {
      updateData.shippingCarrier = shippingCarrier || null
    }

    // Aggiorna ordine
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
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
    })

    // Ricalcola stato automatico dopo aggiornamento
    const finalStatus = calculateOrderStatus(updatedOrder)
    if (finalStatus !== updatedOrder.status) {
      const finalOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: finalStatus },
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
      })
      return NextResponse.json(finalOrder)
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Errore nell\'aggiornamento ordine:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento ordine' },
      { status: 500 }
    )
  }
}

