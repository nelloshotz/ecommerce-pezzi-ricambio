import { prisma } from './prisma'

const MAX_FAILED_ATTEMPTS = 3
const BLOCK_DURATION_HOURS = 24

/**
 * Registra un tentativo di login (riuscito o fallito)
 */
export async function recordLoginAttempt(
  email: string | null,
  ipAddress: string,
  success: boolean
): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email,
      ipAddress,
      success,
    },
  })
}

/**
 * Verifica se un IP o email è bloccato per troppi tentativi falliti
 * Restituisce true se bloccato, false altrimenti
 */
export async function isBlocked(email: string | null, ipAddress: string): Promise<{
  blocked: boolean
  blockedUntil: Date | null
  remainingAttempts: number
}> {
  const now = new Date()
  const cutoffTime = new Date(now.getTime() - BLOCK_DURATION_HOURS * 60 * 60 * 1000)

  // Conta tentativi falliti negli ultimi 24h per questa email o IP
  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      OR: email ? [{ email }, { ipAddress }] : [{ ipAddress }],
      success: false,
      createdAt: {
        gte: cutoffTime,
      },
    },
  })

  // Se ci sono 3 o più tentativi falliti, verifica se c'è un blocco attivo
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    // Cerca l'ultimo tentativo fallito per calcolare quando scade il blocco
    const lastFailedAttempt = await prisma.loginAttempt.findFirst({
      where: {
        OR: email ? [{ email }, { ipAddress }] : [{ ipAddress }],
        success: false,
        createdAt: {
          gte: cutoffTime,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (lastFailedAttempt) {
      // Il blocco scade 24h dopo il terzo tentativo fallito
      const blockedUntil = new Date(
        lastFailedAttempt.createdAt.getTime() + BLOCK_DURATION_HOURS * 60 * 60 * 1000
      )

      if (now < blockedUntil) {
        // Ancora bloccato
        return {
          blocked: true,
          blockedUntil,
          remainingAttempts: 0,
        }
      }
    }
  }

  // Non bloccato o blocco scaduto
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts)
  return {
    blocked: false,
    blockedUntil: null,
    remainingAttempts,
  }
}

/**
 * Pulisce i tentativi di login vecchi (più di 7 giorni)
 */
export async function cleanupOldAttempts(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  await prisma.loginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: sevenDaysAgo,
      },
    },
  })
}

