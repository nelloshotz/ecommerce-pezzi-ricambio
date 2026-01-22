import { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt'
import { prisma } from './prisma'

export interface AuthResult {
  user: JWTPayload | null
  error: string | null
}

/**
 * Verifica l'autenticazione da una richiesta Next.js
 * Estrae e verifica il JWT token dall'header Authorization
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Estrai token dall'header Authorization
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return {
        user: null,
        error: 'Token di autenticazione mancante',
      }
    }

    // Verifica il token
    const payload = verifyToken(token)

    if (!payload) {
      return {
        user: null,
        error: 'Token di autenticazione invalido o scaduto',
      }
    }

    // Verifica che l'utente esista ancora nel database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        banned: true,
      },
    })

    if (!user) {
      return {
        user: null,
        error: 'Utente non trovato',
      }
    }

    // Verifica se l'utente è bannato
    if (user.banned) {
      return {
        user: null,
        error: 'Account bannato',
      }
    }

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      error: null,
    }
  } catch (error) {
    console.error('Errore nella verifica autenticazione:', error)
    return {
      user: null,
      error: 'Errore nella verifica autenticazione',
    }
  }
}

/**
 * Verifica che l'utente sia un amministratore
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuth(request)

  if (authResult.error || !authResult.user) {
    return authResult
  }

  // Verifica ruolo admin
  const role = authResult.user.role.toUpperCase()
  if (role !== 'ADMIN') {
    return {
      user: null,
      error: 'Accesso negato. Solo amministratori.',
    }
  }

  return authResult
}

