import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/jwt'
import { recordLoginAttempt, isBlocked } from '@/lib/loginAttempts'

/**
 * Ottiene l'IP address dalla richiesta
 */
function getClientIP(request: NextRequest): string {
  // Prova vari header per ottenere l'IP reale
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Fallback
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validazione base
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      )
    }

    const ipAddress = getClientIP(request)

    // Verifica se l'IP o email sono bloccati
    const blockStatus = await isBlocked(email, ipAddress)
    if (blockStatus.blocked) {
      const hoursRemaining = Math.ceil(
        (blockStatus.blockedUntil!.getTime() - Date.now()) / (1000 * 60 * 60)
      )
      return NextResponse.json(
        {
          error: `Troppi tentativi falliti. Account temporaneamente bloccato. Riprova tra ${hoursRemaining} ora${hoursRemaining > 1 ? 'e' : ''}.`,
          blocked: true,
          blockedUntil: blockStatus.blockedUntil?.toISOString(),
        },
        { status: 429 } // Too Many Requests
      )
    }

    // Trova utente
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        addresses: {
          where: { isDefault: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    // Se l'utente non esiste, registra tentativo fallito ma non rivelare che l'email non esiste
    if (!user) {
      await recordLoginAttempt(email, ipAddress, false)
      return NextResponse.json(
        { error: 'Email o password non corretti' },
        { status: 401 }
      )
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      // Password errata - registra tentativo fallito
      await recordLoginAttempt(email, ipAddress, false)

      // Verifica se ora è bloccato dopo questo tentativo
      const newBlockStatus = await isBlocked(email, ipAddress)
      if (newBlockStatus.blocked) {
        const hoursRemaining = Math.ceil(
          (newBlockStatus.blockedUntil!.getTime() - Date.now()) / (1000 * 60 * 60)
        )
        return NextResponse.json(
          {
            error: `Troppi tentativi falliti. Account temporaneamente bloccato. Riprova tra ${hoursRemaining} ora${hoursRemaining > 1 ? 'e' : ''}.`,
            blocked: true,
            blockedUntil: newBlockStatus.blockedUntil?.toISOString(),
          },
          { status: 429 }
        )
      }

      // Mostra tentativi rimanenti
      return NextResponse.json(
        {
          error: 'Email o password non corretti',
          remainingAttempts: newBlockStatus.remainingAttempts,
        },
        { status: 401 }
      )
    }

    // Verifica se l'utente è bannato
    if (user.banned) {
      await recordLoginAttempt(email, ipAddress, false)
      return NextResponse.json(
        { 
          error: 'Account bannato. Non puoi effettuare il login. Contatta l\'amministratore per maggiori informazioni.',
          banned: true,
          bannedAt: user.bannedAt?.toISOString(),
          bannedReason: user.bannedReason,
        },
        { status: 403 }
      )
    }

    // Login riuscito - registra tentativo riuscito
    await recordLoginAttempt(email, ipAddress, true)

    // Genera JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Prepara risposta (senza passwordHash)
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: 'Login effettuato con successo',
        token, // Invia il token JWT
        user: {
          ...userWithoutPassword,
          role: user.role.toLowerCase(), // Converti da ADMIN a admin per compatibilità
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore durante il login:', error)
    return NextResponse.json(
      { error: 'Errore durante il login. Riprova più tardi.' },
      { status: 500 }
    )
  }
}

