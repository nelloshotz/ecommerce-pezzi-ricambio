import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  removeExpiredReservations,
  createOrUpdateReservation,
  validateCartReservations,
  hasActiveReservation,
} from '@/lib/cartReservations'
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { verifyAuth } from '@/lib/auth'

const LOG_DIR = join(process.cwd(), 'logs')
const ERROR_LOG_FILE = join(LOG_DIR, 'admin-profilo-errors.log')

// Funzione helper per scrivere log
async function writeLog(data: any) {
  try {
    if (!existsSync(LOG_DIR)) {
      await mkdir(LOG_DIR, { recursive: true })
    }
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'Cart API',
      ...data,
    }
    const logLine = JSON.stringify(logEntry) + '\n'
    await appendFile(ERROR_LOG_FILE, logLine, 'utf-8')
  } catch (error) {
    console.error('Errore nel logging:', error)
  }
}

// GET - Recupera carrello utente
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione JWT
    const authResult = await verifyAuth(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: 401 }
      )
    }

    const userId = authResult.user.userId

    // Prima di tutto, rimuovi le prenotazioni scadute
    await removeExpiredReservations()

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filtra prodotti non più disponibili o inattivi
    const now = new Date()
    const validItems = cartItems.filter((item) => {
      if (!item.product || !item.product.active || !item.product.inStock) {
        return false
      }
      
      // Verifica che la prenotazione non sia scaduta
      if (item.reservationExpiresAt && item.reservationExpiresAt < now) {
        return false
      }
      
      return true
    })

    // Rimuovi prodotti non validi dal carrello
    if (validItems.length < cartItems.length) {
      const invalidItemIds = cartItems
        .filter((item) => {
          if (!item.product || !item.product.active || !item.product.inStock) {
            return true
          }
          if (item.reservationExpiresAt && item.reservationExpiresAt < now) {
            return true
          }
          return false
        })
        .map((item) => item.id)

      await prisma.cartItem.deleteMany({
        where: { id: { in: invalidItemIds } },
      })
    }

    // Converti al formato CartItem dello store
    const formattedItems = validItems.map((item) => {
      const formattedItem = {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price !== null && item.price !== undefined ? item.price : undefined, // Prezzo effettivo pagato (mantieni anche se 0)
        product: item.product,
        reservationExpiresAt: item.reservationExpiresAt,
      }
      
      // Log per debug (non bloccante)
      writeLog({
        action: 'GET_CART_ITEM',
        cartItemId: item.id,
        productId: item.productId,
        itemPrice: item.price,
        productPrice: item.product.price,
        finalPrice: formattedItem.price,
      }).catch(() => {}) // Ignora errori di logging
      
      return formattedItem
    })

    return NextResponse.json({ items: formattedItems }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel caricamento carrello:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento carrello' },
      { status: 500 }
    )
  }
}

// POST - Aggiungi/modifica prodotto nel carrello
export async function POST(request: NextRequest) {
  let body: any = null
  let productId: string | undefined = undefined
  let quantity: number | undefined = undefined
  let price: number | undefined = undefined
  let userId: string | null = null
  
  try {
    // Verifica autenticazione JWT
    const authResult = await verifyAuth(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: 401 }
      )
    }

    userId = authResult.user.userId
    body = await request.json()
    productId = body.productId
    quantity = body.quantity
    price = body.price

    await writeLog({
      action: 'POST_CART_REQUEST',
      productId,
      quantity,
      price,
      userId,
    })

    // Verifica se l'utente è bannato
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, banned: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (user.banned) {
      return NextResponse.json(
        { error: 'Account bannato. Non puoi aggiungere prodotti al carrello.' },
        { status: 403 }
      )
    }

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Dati non validi' },
        { status: 400 }
      )
    }

    // Verifica che il prodotto esista e sia disponibile
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || !product.active || !product.inStock) {
      return NextResponse.json(
        { error: 'Prodotto non disponibile' },
        { status: 404 }
      )
    }

    // Trova item esistente nel carrello
    const existing = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
      },
    })

    // La quantity passata dal client potrebbe essere già la quantità finale
    // o la quantità da aggiungere. Per sicurezza, assumiamo che sia la quantità finale
    // Se esiste già, verifichiamo che la nuova quantità sia valida
    const finalQuantity = quantity

    // Verifica disponibilità, considerando anche le prenotazioni attive
    // Se il prodotto ha solo 1 pezzo e c'è già una prenotazione attiva per un altro utente, non è disponibile
    if (product.stockQuantity === 1 && finalQuantity >= 1) {
      const hasReservation = await hasActiveReservation(productId, userId)
      if (hasReservation) {
        return NextResponse.json(
          { error: 'Il prodotto è temporaneamente prenotato da un altro utente. Riprova più tardi.' },
          { status: 409 } // Conflict
        )
      }
    }

    if (finalQuantity > product.stockQuantity) {
      return NextResponse.json(
        { error: `Quantità non disponibile. Disponibili solo ${product.stockQuantity} pezzi.` },
        { status: 400 }
      )
    }

    if (finalQuantity <= 0) {
      // Se quantità <= 0, rimuovi dal carrello
      if (existing) {
        await prisma.cartItem.delete({
          where: { id: existing.id },
        })
      }
      return NextResponse.json({ message: 'Prodotto rimosso dal carrello' }, { status: 200 })
    }

    // Crea o aggiorna prenotazione se necessario (per prodotti con 1 solo pezzo)
    let reservationExpiresAt: Date | null = null
    try {
      reservationExpiresAt = await createOrUpdateReservation(
        userId,
        productId,
        finalQuantity
      )
    } catch (error: any) {
      // Se c'è un errore (es. prodotto già prenotato da altro utente), restituisci errore
      // Ma questo non dovrebbe succedere perché abbiamo già verificato prima
      return NextResponse.json(
        { error: error.message || 'Errore nella prenotazione prodotto' },
        { status: 409 }
      )
    }

    // Se il prodotto non ha più 1 pezzo (o quantità aggiornata), rimuovi prenotazione
    const shouldHaveReservation = product.stockQuantity === 1 && finalQuantity >= 1
    const finalReservationExpiresAt = shouldHaveReservation ? reservationExpiresAt : null

    // Usa findFirst + update/create (più affidabile per constraint composti)
    let cartItem
    // Arrotonda il prezzo a 2 decimali per evitare problemi di precisione
    const priceToSave = price !== undefined && price !== null ? Math.round(parseFloat(String(price)) * 100) / 100 : null
    
    await writeLog({
      action: 'POST_CART_SAVE',
      existing: !!existing,
      finalQuantity,
      priceToSave,
      price,
      productId,
    })
    
    if (existing) {
      // Aggiorna quantità esistente, prezzo e prenotazione
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: finalQuantity,
          price: priceToSave,
          reservationExpiresAt: finalReservationExpiresAt,
        },
        include: { product: true },
      })
    } else {
      // Crea nuovo item con prenotazione se necessaria
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity: finalQuantity,
          price: priceToSave,
          reservationExpiresAt: finalReservationExpiresAt,
        },
        include: { product: true },
      })
    }
    
    await writeLog({
      action: 'POST_CART_SUCCESS',
      cartItemId: cartItem.id,
      price: cartItem.price,
      productId,
    })

    return NextResponse.json({ item: cartItem }, { status: 200 })
  } catch (error: any) {
    await writeLog({
      action: 'POST_CART_ERROR',
      error: error.message,
      stack: error.stack,
      productId: productId || body?.productId,
      userId,
    })
    console.error('Errore nell\'aggiunta al carrello:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiunta al carrello' },
      { status: 500 }
    )
  }
}

// DELETE - Rimuovi prodotto dal carrello
export async function DELETE(request: NextRequest) {
  try {
    // Verifica autenticazione JWT
    const authResult = await verifyAuth(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: 401 }
      )
    }

    const userId = authResult.user.userId
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica se l'utente è bannato
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, banned: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (user.banned) {
      return NextResponse.json(
        { error: 'Account bannato. Non puoi modificare il carrello.' },
        { status: 403 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'ID prodotto richiesto' },
        { status: 400 }
      )
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
      },
    })

    if (cartItem) {
      await prisma.cartItem.delete({
        where: { id: cartItem.id },
      })
    }

    return NextResponse.json({ message: 'Prodotto rimosso dal carrello' }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nella rimozione dal carrello:', error)
    return NextResponse.json(
      { error: 'Errore nella rimozione dal carrello' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna quantità prodotto nel carrello
export async function PUT(request: NextRequest) {
  try {
    // Verifica autenticazione JWT
    const authResult = await verifyAuth(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: 401 }
      )
    }

    const userId = authResult.user.userId
    const body = await request.json()
    const { productId, quantity, price } = body

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica se l'utente è bannato
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, banned: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (user.banned) {
      return NextResponse.json(
        { error: 'Account bannato. Non puoi modificare il carrello.' },
        { status: 403 }
      )
    }

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Dati non validi' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      // Se quantità <= 0, rimuovi dal carrello
      const existing = await prisma.cartItem.findFirst({
        where: {
          userId,
          productId,
        },
      })
      
      if (existing) {
        await prisma.cartItem.delete({
          where: { id: existing.id },
        })
      }
      
      return NextResponse.json({ message: 'Prodotto rimosso dal carrello' }, { status: 200 })
    }

    // Rimuovi prenotazioni scadute prima di aggiornare
    await removeExpiredReservations()

    // Verifica disponibilità
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || !product.active || !product.inStock) {
      return NextResponse.json(
        { error: 'Prodotto non disponibile' },
        { status: 404 }
      )
    }

    // Verifica prenotazioni attive per prodotti con 1 solo pezzo
    if (product.stockQuantity === 1 && quantity >= 1) {
      const hasReservation = await hasActiveReservation(productId, userId)
      if (hasReservation) {
        return NextResponse.json(
          { error: 'Il prodotto è temporaneamente prenotato da un altro utente. Riprova più tardi.' },
          { status: 409 }
        )
      }
    }

    if (quantity > product.stockQuantity) {
      return NextResponse.json(
        { error: `Quantità non disponibile. Disponibili solo ${product.stockQuantity} pezzi.` },
        { status: 400 }
      )
    }

    // Trova item esistente
    const existing = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Prodotto non trovato nel carrello' },
        { status: 404 }
      )
    }

    // Crea o aggiorna prenotazione se necessario
    let reservationExpiresAt: Date | null = null
    try {
      reservationExpiresAt = await createOrUpdateReservation(
        userId,
        productId,
        quantity
      )
    } catch (error: any) {
      // Se c'è un errore (es. prodotto già prenotato da altro utente), restituisci errore
      return NextResponse.json(
        { error: error.message || 'Errore nella prenotazione prodotto' },
        { status: 409 }
      )
    }

    // Se il prodotto non ha più 1 pezzo, rimuovi prenotazione
    const shouldHaveReservation = product.stockQuantity === 1 && quantity >= 1
    const finalReservationExpiresAt = shouldHaveReservation 
      ? (reservationExpiresAt || existing.reservationExpiresAt) 
      : null

    // Aggiorna quantità, prezzo (se passato) e prenotazione
    // Se il prezzo non viene passato, mantieni quello esistente
    const priceToUpdate = price !== undefined && price !== null 
      ? Math.round(parseFloat(String(price)) * 100) / 100 
      : existing.price
    
    await writeLog({
      action: 'PUT_CART_UPDATE',
      productId,
      quantity,
      price,
      priceToUpdate,
      existingPrice: existing.price,
    })
    
    const cartItem = await prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity,
        price: priceToUpdate,
        reservationExpiresAt: finalReservationExpiresAt,
      },
      include: { product: true },
    })

    return NextResponse.json({ item: cartItem }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento carrello:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento carrello' },
      { status: 500 }
    )
  }
}

