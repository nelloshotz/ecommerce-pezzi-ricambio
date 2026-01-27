import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptSecret, decryptSecret } from '@/lib/stripe'

// GET - Recupera configurazione Stripe (solo admin)
export async function GET(request: NextRequest) {
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

    const config = await prisma.stripeConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!config) {
      return NextResponse.json(
        {
          config: null,
          message: 'Nessuna configurazione Stripe trovata',
        },
        { status: 200 }
      )
    }

    // Decripta la secret key per poterla mostrare/modificare
    const decryptedSecretKey = config.secretKey ? decryptSecret(config.secretKey) : ''
    
    // Ritorna configurazione (senza mostrare completamente la secret key per sicurezza)
    const maskedSecretKey = decryptedSecretKey
      ? `${decryptedSecretKey.substring(0, 12)}...${decryptedSecretKey.substring(decryptedSecretKey.length - 4)}`
      : null

    return NextResponse.json({
      config: {
        id: config.id,
        publishableKey: config.publishableKey || '',
        secretKey: maskedSecretKey, // Mostra solo inizio e fine per sicurezza
        secretKeyFull: decryptedSecretKey, // Ritorna la chiave completa decriptata per modifica
        webhookSecret: config.webhookSecret || '',
        isTestMode: config.isTestMode,
        isActive: config.isActive,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Errore nel recupero configurazione Stripe:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero configurazione Stripe', details: error.message },
      { status: 500 }
    )
  }
}

// POST/PUT - Salva configurazione Stripe (solo admin)
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
    const {
      publishableKey,
      secretKey,
      webhookSecret,
      isTestMode = true,
      isActive = false,
    } = body

    // Validazione
    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { error: 'Publishable Key e Secret Key sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica formato chiavi Stripe
    if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
      return NextResponse.json(
        { error: 'Publishable Key non valida. Deve iniziare con pk_test_ o pk_live_' },
        { status: 400 }
      )
    }

    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { error: 'Secret Key non valida. Deve iniziare con sk_test_ o sk_live_' },
        { status: 400 }
      )
    }

    // Verifica coerenza modalità (test vs live)
    const publishableIsTest = publishableKey.startsWith('pk_test_')
    const secretIsTest = secretKey.startsWith('sk_test_')
    
    if (publishableIsTest !== secretIsTest) {
      return NextResponse.json(
        { error: 'Publishable Key e Secret Key devono essere entrambe in modalità test o live' },
        { status: 400 }
      )
    }

    // Se è attiva e modalità live, richiedi conferma
    if (isActive && !publishableIsTest) {
      // In produzione potresti voler richiedere una conferma aggiuntiva per modalità live
    }

    // Verifica che Stripe funzioni con queste credenziali
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia' as any,
      })
      
      // Testa le credenziali facendo una chiamata semplice
      await stripe.balance.retrieve()
    } catch (error: any) {
      return NextResponse.json(
        { error: `Credenziali Stripe non valide: ${error.message}` },
        { status: 400 }
      )
    }

    // Disattiva tutte le altre configurazioni
    if (isActive) {
      await prisma.stripeConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    // Cerca configurazione esistente
    const existingConfig = await prisma.stripeConfig.findFirst({
      where: { isActive: isActive ? true : undefined },
      orderBy: { updatedAt: 'desc' },
    })

    let config

    if (existingConfig) {
      // Aggiorna configurazione esistente
      config = await prisma.stripeConfig.update({
        where: { id: existingConfig.id },
        data: {
          publishableKey,
          secretKey: encryptSecret(secretKey), // Cripta prima di salvare
          webhookSecret: webhookSecret || null,
          isTestMode: publishableIsTest,
          isActive,
        },
      })
    } else {
      // Crea nuova configurazione
      config = await prisma.stripeConfig.create({
        data: {
          publishableKey,
          secretKey: encryptSecret(secretKey), // Cripta prima di salvare
          webhookSecret: webhookSecret || null,
          isTestMode: publishableIsTest,
          isActive,
        },
      })
    }

    const maskedSecretKey = config.secretKey
      ? `${config.secretKey.substring(0, 12)}...${config.secretKey.substring(config.secretKey.length - 4)}`
      : null

    return NextResponse.json({
      config: {
        id: config.id,
        publishableKey: config.publishableKey || '',
        secretKey: maskedSecretKey,
        webhookSecret: config.webhookSecret || '',
        isTestMode: config.isTestMode,
        isActive: config.isActive,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
      message: 'Configurazione Stripe salvata con successo',
    })
  } catch (error: any) {
    console.error('Errore nel salvataggio configurazione Stripe:', error)
    return NextResponse.json(
      { error: 'Errore nel salvataggio configurazione Stripe', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna configurazione Stripe (alias di POST)
export async function PUT(request: NextRequest) {
  return POST(request)
}

