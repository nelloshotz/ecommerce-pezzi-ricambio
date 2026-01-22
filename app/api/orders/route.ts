import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { removeExpiredReservations, validateCartReservations } from '@/lib/cartReservations'

// Funzione per generare numero ordine univoco
function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD-${year}${month}${day}-${random}`
}

// Funzione per generare tracking number
function generateTrackingNumber(): string {
  const random = Math.random().toString(36).substring(2, 15).toUpperCase()
  return `TRACK-${random}`
}

// POST - Crea nuovo ordine dal checkout
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione JWT
    const { verifyAuth } = await import('@/lib/auth')
    const authResult = await verifyAuth(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: 401 }
      )
    }

    const userId = authResult.user.userId
    const body = await request.json()

    const {
      items,
      shippingAddressId,
      billingAddressId,
      paymentMethod = 'Carta di Credito',
      notes,
      subtotal,
      discountAmount = 0,
      discountPercent,
      couponCode,
      couponId,
      shippingCost = 0,
      shippingCarrier,
      shippingBaseCost,
      shippingMarkupPercent,
      shippingPackages,
      isFreeShipping = false,
      tax = 0,
      total,
      paymentStatus = 'PAID',
      stripePaymentIntentId,
      stripeClientSecret,
    } = body

    // Verifica se l'utente è bannato
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, banned: true, bannedAt: true, bannedReason: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (user.banned) {
      return NextResponse.json(
        { 
          error: 'Account bannato. Non puoi effettuare ordini.',
          banned: true,
          bannedAt: user.bannedAt?.toISOString(),
          bannedReason: user.bannedReason,
        },
        { status: 403 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Carrello vuoto' },
        { status: 400 }
      )
    }

    if (!shippingAddressId || !billingAddressId) {
      return NextResponse.json(
        { error: 'Indirizzi di spedizione e fatturazione richiesti' },
        { status: 400 }
      )
    }

    // Verifica che gli indirizzi appartengano all'utente
    const [shippingAddr, billingAddr] = await Promise.all([
      prisma.address.findUnique({
        where: { id: shippingAddressId },
      }),
      prisma.address.findUnique({
        where: { id: billingAddressId },
      }),
    ])

    if (!shippingAddr || shippingAddr.userId !== userId) {
      return NextResponse.json(
        { error: 'Indirizzo di spedizione non valido' },
        { status: 400 }
      )
    }

    if (!billingAddr || billingAddr.userId !== userId) {
      return NextResponse.json(
        { error: 'Indirizzo di fatturazione non valido' },
        { status: 400 }
      )
    }

    // Prima di tutto, rimuovi prenotazioni scadute e verifica quelle del carrello
    await removeExpiredReservations()
    const reservationCheck = await validateCartReservations(userId)
    
    if (!reservationCheck.valid && reservationCheck.expiredItems.length > 0) {
      return NextResponse.json(
        {
          error: 'Alcuni prodotti nel carrello hanno prenotazioni scadute. Per favore, ricarica il carrello.',
          expiredItems: reservationCheck.expiredItems,
        },
        { status: 409 }
      )
    }

    // Verifica disponibilità prodotti e calcola totale
    // Verifica anche che le prenotazioni siano ancora valide per prodotti con 1 solo pezzo
    const orderItems: Array<{
      productId: string
      quantity: number
      price: number
      total: number
      productName: string
      productSku?: string | null
    }> = []
    let calculatedSubtotal = 0
    const now = new Date()

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      if (!product || !product.active || !product.inStock) {
        return NextResponse.json(
          { error: `Prodotto ${item.product?.name || item.productId} non disponibile` },
          { status: 400 }
        )
      }

      // Verifica prenotazione se il prodotto ha solo 1 pezzo
      if (product.stockQuantity === 1 && item.quantity >= 1) {
        // Verifica che l'item sia nel carrello dell'utente con prenotazione valida
        const cartItem = await prisma.cartItem.findFirst({
          where: {
            userId,
            productId: item.productId,
          },
        })

        if (!cartItem) {
          return NextResponse.json(
            { error: `Prodotto ${product.name} non trovato nel carrello.` },
            { status: 400 }
          )
        }

        // Verifica che la prenotazione sia ancora valida
        if (cartItem.reservationExpiresAt && cartItem.reservationExpiresAt < now) {
          // Rimuovi dal carrello e fallisci checkout
          await prisma.cartItem.delete({
            where: { id: cartItem.id },
          })
          
          return NextResponse.json(
            {
              error: `La prenotazione per ${product.name} è scaduta. Il prodotto è stato rimosso dal carrello. Per favore, riprova se è ancora disponibile.`,
              expiredProduct: product.name,
            },
            { status: 409 }
          )
        }
      }

      if (item.quantity > product.stockQuantity) {
        return NextResponse.json(
          { error: `Quantità non disponibile per ${product.name}. Disponibili solo ${product.stockQuantity} pezzi.` },
          { status: 400 }
        )
      }

      const itemPrice = product.price
      const itemTotal = itemPrice * item.quantity
      calculatedSubtotal += itemTotal

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        total: itemTotal,
        productName: product.name,
        productSku: product.sku,
      })
    }

    // Verifica e valida coupon se presente
    if (couponId && couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { id: couponId },
      })

      if (!coupon || coupon.code !== couponCode.toUpperCase().trim()) {
        return NextResponse.json(
          { error: 'Coupon non valido' },
          { status: 400 }
        )
      }

      if (coupon.isUsed) {
        return NextResponse.json(
          { error: 'Coupon già utilizzato' },
          { status: 400 }
        )
      }
    }

    // Calcola totale finale (include sconto se presente)
    const finalDiscountAmount = discountAmount || 0
    const calculatedTotal = calculatedSubtotal - finalDiscountAmount + shippingCost + tax

    // Se viene passato un totale dal client, usalo (già include lo sconto)
    const finalTotal = total || calculatedTotal

    // Crea ordine in transazione
    const order = await prisma.$transaction(async (tx) => {
      // Genera numero ordine univoco
      let orderNumber = generateOrderNumber()
      let exists = true
      while (exists) {
        const existing = await tx.order.findUnique({
          where: { orderNumber },
        })
        if (!existing) {
          exists = false
        } else {
          orderNumber = generateOrderNumber()
        }
      }

      // Determina stato iniziale: se pagato, diventa CONFIRMED, altrimenti PENDING
      // Per ora assumiamo che se arriva qui è già pagato (paymentStatus sarà PAID)
      // In produzione verrai da un webhook di pagamento
      const paymentStatusValue = paymentStatus || 'PAID' // Default PAID per ora (in produzione gestito da webhook)
      const initialStatus = paymentStatusValue === 'PAID' ? 'CONFIRMED' : 'PENDING'

      // Crea ordine
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: initialStatus,
          subtotal: calculatedSubtotal,
          discountAmount: finalDiscountAmount,
          discountPercent: discountPercent || null,
          couponCode: couponCode || null,
          couponId: couponId || null,
          shippingCost,
          shippingCarrier: shippingCarrier || null,
          shippingBaseCost: shippingBaseCost || null,
          shippingMarkupPercent: shippingMarkupPercent || null,
          shippingPackages: shippingPackages ? JSON.stringify(shippingPackages) : null,
          isFreeShipping: isFreeShipping || false,
          tax,
          total: finalTotal,
          paymentMethod,
          paymentStatus: paymentStatusValue,
          shippingAddressId,
          billingAddressId,
          notes: notes || null,
          confirmedAt: initialStatus === 'CONFIRMED' ? new Date() : null,
          paymentId: stripePaymentIntentId || null,
          stripePaymentIntentId: stripePaymentIntentId || null,
          stripeClientSecret: stripeClientSecret || null,
        },
      })

      // Crea order items
      for (const orderItem of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            price: orderItem.price,
            total: orderItem.total,
            productName: orderItem.productName,
            productSku: orderItem.productSku,
          },
        })

        // Recupera prodotto attuale (all'interno della transazione per avere valori aggiornati)
        const currentProduct = await tx.product.findUnique({
          where: { id: orderItem.productId },
        })

        if (!currentProduct) {
          throw new Error(`Prodotto ${orderItem.productId} non trovato`)
        }

        // Verifica disponibilità finale (potrebbe essere cambiata nel frattempo)
        if (orderItem.quantity > currentProduct.stockQuantity) {
          throw new Error(`Quantità non disponibile per ${orderItem.productName}. Disponibili solo ${currentProduct.stockQuantity} pezzi.`)
        }

        // Calcola nuova quantità
        const initialQuantity = currentProduct.stockQuantity
        const newQuantity = initialQuantity - orderItem.quantity

        if (newQuantity < 0) {
          throw new Error(`Quantità insufficiente per prodotto ${orderItem.productName}`)
        }

        // Aggiorna quantità prodotto (diminuisce stock)
        await tx.product.update({
          where: { id: orderItem.productId },
          data: {
            stockQuantity: newQuantity,
            inStock: newQuantity > 0,
          },
        })

        // Salva quantityAfter per movimento inventario
        ;(orderItem as any).quantityAfter = newQuantity
      }

      // Crea movimento inventario per ogni prodotto (dopo aver aggiornato le quantità)
      for (const orderItem of orderItems) {
        await tx.inventoryMovement.create({
          data: {
            productId: orderItem.productId,
            type: 'SALE',
            quantity: -orderItem.quantity, // Negativo per vendita
            quantityAfter: (orderItem as any).quantityAfter || 0,
            reason: `Ordine ${orderNumber}`,
            orderId: newOrder.id,
            userId,
          },
        })
      }

      // Se c'è un coupon, marcalo come utilizzato
      if (couponId && couponCode) {
        await tx.coupon.update({
          where: { id: couponId },
          data: {
            isUsed: true,
            usedAt: new Date(),
            usedByOrderId: newOrder.id,
            usedByUserId: userId,
          },
        })
      }

      // Svuota carrello utente
      await tx.cartItem.deleteMany({
        where: { userId },
      })

      return newOrder
    })

    // Carica ordine completo con relazioni
    const orderWithDetails = await prisma.order.findUnique({
      where: { id: order.id },
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
    })

    return NextResponse.json(
      {
        message: 'Ordine creato con successo',
        order: orderWithDetails,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Errore nella creazione ordine:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione dell\'ordine. Riprova più tardi.' },
      { status: 500 }
    )
  }
}

