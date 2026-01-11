import { NextRequest, NextResponse } from 'next/server'
import { appendFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const LOG_DIR = join(process.cwd(), 'logs')
const CART_DEBUG_LOG_FILE = join(LOG_DIR, 'user-cart-debug.log')

// Crea la directory logs se non esiste
async function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true })
  }
}

// POST - Scrive un log di debug del carrello
export async function POST(request: NextRequest) {
  try {
    await ensureLogDir()

    const body = await request.json()
    const { userRole, itemsCount, subtotal, freeShippingThreshold, missingForFreeShipping, loadingThreshold, shouldShowMessage, userId, additionalInfo } = body

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: userId || null,
      userRole: userRole || null,
      itemsCount: itemsCount || 0,
      subtotal: subtotal || 0,
      freeShippingThreshold: freeShippingThreshold || null,
      missingForFreeShipping: missingForFreeShipping || null,
      loadingThreshold: loadingThreshold || false,
      shouldShowMessage: shouldShowMessage || false,
      ...(additionalInfo ? { additionalInfo } : {}),
    }

    const logLine = JSON.stringify(logEntry) + '\n'

    await appendFile(CART_DEBUG_LOG_FILE, logLine, 'utf-8')

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel logging carrello:', error)
    return NextResponse.json(
      { error: 'Errore nel logging carrello', details: error.message },
      { status: 500 }
    )
  }
}

