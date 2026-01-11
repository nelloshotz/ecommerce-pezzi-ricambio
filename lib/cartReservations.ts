// Utility per gestire prenotazioni temporanee del carrello

import { prisma } from '@/lib/prisma'

/**
 * Rimuove tutte le prenotazioni scadute dal carrello
 * Le prenotazioni scadono dopo 20 minuti
 */
export async function removeExpiredReservations() {
  const now = new Date()
  
  const expiredItems = await prisma.cartItem.findMany({
    where: {
      reservationExpiresAt: {
        not: null,
        lt: now, // Meno di "ora" significa scaduto
      },
    },
    include: {
      product: true,
    },
  })

  if (expiredItems.length === 0) {
    return { removed: 0, items: [] }
  }

  // Rimuovi i prodotti dal carrello
  const expiredItemIds = expiredItems.map((item) => item.id)
  
  await prisma.cartItem.deleteMany({
    where: {
      id: { in: expiredItemIds },
    },
  })

  // I prodotti vengono automaticamente rimessi a disposizione
  // quando vengono rimossi dal carrello (stockQuantity non viene decrementato)

  return {
    removed: expiredItems.length,
    items: expiredItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      userId: item.userId,
    })),
  }
}

/**
 * Verifica se un prodotto ha una prenotazione attiva per un altro utente
 */
export async function hasActiveReservation(productId: string, excludeUserId?: string) {
  const now = new Date()
  
  const activeReservation = await prisma.cartItem.findFirst({
    where: {
      productId,
      reservationExpiresAt: {
        not: null,
        gt: now, // Maggiore di "ora" significa ancora attivo
      },
      ...(excludeUserId && {
        userId: { not: excludeUserId },
      }),
    },
  })

  return !!activeReservation
}

/**
 * Crea o aggiorna una prenotazione per un prodotto nel carrello
 * Se il prodotto ha solo 1 pezzo disponibile, imposta prenotazione di 20 minuti
 */
export async function createOrUpdateReservation(
  userId: string,
  productId: string,
  quantity: number
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  })

  if (!product) {
    throw new Error('Prodotto non trovato')
  }

  // Se il prodotto ha solo 1 pezzo disponibile e l'utente vuole aggiungerlo
  if (product.stockQuantity === 1 && quantity >= 1) {
    // Verifica se c'è già una prenotazione attiva per un altro utente
    const hasReservation = await hasActiveReservation(productId, userId)
    
    if (hasReservation) {
      throw new Error('Il prodotto è temporaneamente prenotato da un altro utente. Riprova più tardi.')
    }

    // Imposta prenotazione di 20 minuti
    const reservationExpiresAt = new Date()
    reservationExpiresAt.setMinutes(reservationExpiresAt.getMinutes() + 20)

    return reservationExpiresAt
  }

  // Se il prodotto ha più di 1 pezzo, non serve prenotazione
  return null
}

/**
 * Verifica che tutte le prenotazioni del carrello siano ancora valide
 */
export async function validateCartReservations(userId: string) {
  const now = new Date()
  
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: true,
    },
  })

  const invalidItems = cartItems.filter(
    (item) =>
      item.reservationExpiresAt !== null &&
      item.reservationExpiresAt < now
  )

  if (invalidItems.length > 0) {
    // Rimuovi prodotti con prenotazioni scadute
    const invalidItemIds = invalidItems.map((item) => item.id)
    
    await prisma.cartItem.deleteMany({
      where: {
        id: { in: invalidItemIds },
      },
    })

    return {
      valid: false,
      expiredItems: invalidItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
      })),
    }
  }

  return { valid: true, expiredItems: [] }
}

