import { NextRequest, NextResponse } from 'next/server'
import { getStripeInstance } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

// POST - Crea Payment Intent Stripe
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
    const { amount, currency = 'eur', items, shippingAddressId, billingAddressId, shippingCost } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Importo non valido' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Carrello vuoto' },
        { status: 400 }
      )
    }

    // Verifica disponibilità prodotti e calcola totale
    const orderItems = []
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
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

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
      })
    }

    // Verifica indirizzi
    if (!shippingAddressId || !billingAddressId) {
      return NextResponse.json(
        { error: 'Indirizzi di spedizione e fatturazione richiesti' },
        { status: 400 }
      )
    }

    const [shippingAddr, billingAddr] = await Promise.all([
      prisma.address.findUnique({ where: { id: shippingAddressId } }),
      prisma.address.findUnique({ where: { id: billingAddressId } }),
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

    // Ottieni istanza Stripe
    const stripe = await getStripeInstance()

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe non configurato. Contatta l\'amministratore.' },
        { status: 503 }
      )
    }

    // Crea metadata per l'ordine
    const metadata: Record<string, string> = {
      userId,
      shippingAddressId,
      billingAddressId,
    }

    // Crea Payment Intent su Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe usa centesimi
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Ordine MotorPlanet - ${orderItems.length} prodotti`,
      receipt_email: billingAddr.email,
      shipping: {
        name: `${shippingAddr.firstName} ${shippingAddr.lastName}`,
        phone: shippingAddr.phone,
        address: {
          line1: shippingAddr.address,
          city: shippingAddr.city,
          postal_code: shippingAddr.postalCode,
          country: 'IT',
        },
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    console.error('Errore nella creazione payment intent:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione pagamento', details: error.message },
      { status: 500 }
    )
  }
}

