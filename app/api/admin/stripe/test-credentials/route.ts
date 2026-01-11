import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

// POST - Testa credenziali Stripe
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo amministratori.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { secretKey } = body

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Secret Key richiesta' },
        { status: 400 }
      )
    }

    // Verifica formato
    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { error: 'Secret Key non valida. Deve iniziare con sk_test_ o sk_live_' },
        { status: 400 }
      )
    }

    try {
      // Crea istanza Stripe con le credenziali fornite
      const stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia' as any,
      })

      // Testa le credenziali facendo una chiamata semplice
      const balance = await stripe.balance.retrieve()

      return NextResponse.json({
        success: true,
        message: 'Credenziali Stripe valide e funzionanti!',
        testMode: secretKey.startsWith('sk_test_'),
        accountInfo: {
          available: balance.available[0]?.amount ? balance.available[0].amount / 100 : 0,
          currency: balance.available[0]?.currency || 'EUR',
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: `Credenziali non valide: ${error.message}` },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Errore nel test credenziali:', error)
    return NextResponse.json(
      { error: 'Errore nel test credenziali', details: error.message },
      { status: 500 }
    )
  }
}

