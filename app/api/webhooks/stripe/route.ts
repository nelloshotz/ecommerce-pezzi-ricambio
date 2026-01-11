import { NextRequest, NextResponse } from 'next/server'
import { getStripeConfig, getStripeInstance } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Configurazione route per Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Webhook Stripe per gestire eventi pagamento
export async function POST(request: NextRequest) {
  try {
    // Ottieni configurazione Stripe
    const config = await getStripeConfig()
    
    if (!config || !config.webhookSecret) {
      console.error('Webhook secret non configurato')
      return NextResponse.json(
        { error: 'Webhook non configurato' },
        { status: 500 }
      )
    }

    // Ottieni corpo della richiesta come testo
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature mancante' },
        { status: 400 }
      )
    }

    // Ottieni istanza Stripe
    const stripe = await getStripeInstance()
    
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe non configurato' },
        { status: 500 }
      )
    }

    let event: Stripe.Event

    try {
      // Verifica firma webhook
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.webhookSecret
      )
    } catch (err: any) {
      console.error('Errore verifica webhook:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    // Gestisci eventi
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Aggiorna ordine con stato pagamento
        if (paymentIntent.metadata.userId && paymentIntent.metadata.shippingAddressId) {
          // Cerca ordine per payment intent ID o crea nuovo ordine se non esiste
          let order = await prisma.order.findFirst({
            where: {
              stripePaymentIntentId: paymentIntent.id,
            },
          })

          if (!order && paymentIntent.metadata.userId) {
            // Se l'ordine non esiste ancora, crealo
            // Questo può succedere se il webhook arriva prima che l'ordine sia creato dal frontend
            // In questo caso creiamo l'ordine qui
            // TODO: Recuperare items dal carrello dell'utente o da metadata
            console.log('Payment intent completato ma ordine non trovato. Payment Intent ID:', paymentIntent.id)
          } else if (order) {
            // Aggiorna ordine
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
                paymentId: paymentIntent.id,
                confirmedAt: new Date(),
              },
            })
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Aggiorna ordine con stato pagamento fallito
        const order = await prisma.order.findFirst({
          where: {
            stripePaymentIntentId: paymentIntent.id,
          },
        })

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'FAILED',
              status: 'CANCELLED',
            },
          })
        }
        break
      }

      default:
        console.log(`Evento non gestito: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Errore nel webhook Stripe:', error)
    return NextResponse.json(
      { error: 'Errore nel webhook', details: error.message },
      { status: 500 }
    )
  }
}

