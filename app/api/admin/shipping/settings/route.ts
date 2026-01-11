import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// GET - Recupera impostazioni spedizione
export async function GET(request: NextRequest) {
  try {
    // Solo admin può accedere
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    // Recupera impostazioni attive
    const settings = await prisma.shippingSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!settings) {
      // Se non ci sono impostazioni, crea quelle di default
      const defaultSettings = await prisma.shippingSettings.create({
        data: {
          markupPercent: 0,
          freeShippingThreshold: null,
          fixedShippingPrice: null,
          isActive: true,
        },
      })
      return NextResponse.json(
        {
          markupPercent: defaultSettings.markupPercent,
          freeShippingThreshold: defaultSettings.freeShippingThreshold,
          fixedShippingPrice: defaultSettings.fixedShippingPrice,
          isActive: defaultSettings.isActive,
        },
        { status: 200 }
      )
    }

      return NextResponse.json(
        {
          markupPercent: settings.markupPercent,
          freeShippingThreshold: settings.freeShippingThreshold,
          fixedShippingPrice: settings.fixedShippingPrice,
          isActive: settings.isActive,
        },
        { status: 200 }
      )
  } catch (error: any) {
    console.error('Errore nel recupero impostazioni spedizione:', error)
    // Log nel file
    try {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      const logFile = path.join(logDir, 'admin-profilo-errors.log')
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'admin/shipping/settings',
        error: 'Errore nel recupero impostazioni spedizione',
        details: error?.message || String(error),
        stack: error?.stack,
      }
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
    } catch (logError) {
      console.error('Errore nel logging:', logError)
    }
    return NextResponse.json(
      { 
        error: 'Errore nel recupero impostazioni spedizione',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

// POST - Salva impostazioni spedizione
export async function POST(request: NextRequest) {
  try {
    // Solo admin può accedere
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    const body = await request.json()
    const { markupPercent, freeShippingThreshold, fixedShippingPrice } = body

    // Validazione markupPercent
    if (markupPercent === undefined || markupPercent === null) {
      return NextResponse.json(
        { error: 'Percentuale ricarico obbligatoria' },
        { status: 400 }
      )
    }

    const markupValue = parseFloat(markupPercent.toString())
    if (isNaN(markupValue) || markupValue < 0 || markupValue > 100) {
      return NextResponse.json(
        { error: 'Percentuale ricarico deve essere un numero tra 0 e 100' },
        { status: 400 }
      )
    }

    // Validazione freeShippingThreshold (opzionale)
    let thresholdValue: number | null = null
    if (freeShippingThreshold !== undefined && freeShippingThreshold !== null && freeShippingThreshold !== '') {
      thresholdValue = parseFloat(freeShippingThreshold.toString())
      if (isNaN(thresholdValue) || thresholdValue < 0) {
        return NextResponse.json(
          { error: 'Importo minimo spedizione gratuita deve essere un numero positivo' },
          { status: 400 }
        )
      }
    }

    // Validazione fixedShippingPrice (opzionale)
    let fixedPriceValue: number | null = null
    if (fixedShippingPrice !== undefined && fixedShippingPrice !== null && fixedShippingPrice !== '') {
      fixedPriceValue = parseFloat(fixedShippingPrice.toString())
      if (isNaN(fixedPriceValue) || fixedPriceValue < 0) {
        return NextResponse.json(
          { error: 'Prezzo fisso spedizione deve essere un numero positivo' },
          { status: 400 }
        )
      }
    }

    // Disattiva tutte le impostazioni esistenti prima di crearne una nuova
    await prisma.shippingSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Crea nuove impostazioni attive
    const newSettings = await prisma.shippingSettings.create({
      data: {
        markupPercent: markupValue,
        freeShippingThreshold: thresholdValue,
        fixedShippingPrice: fixedPriceValue,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        markupPercent: newSettings.markupPercent,
        freeShippingThreshold: newSettings.freeShippingThreshold,
        fixedShippingPrice: newSettings.fixedShippingPrice,
        isActive: newSettings.isActive,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel salvataggio impostazioni spedizione:', error)
    // Log nel file
    try {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      const logFile = path.join(logDir, 'admin-profilo-errors.log')
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'admin/shipping/settings',
        error: 'Errore nel salvataggio impostazioni spedizione',
        details: error?.message || String(error),
        stack: error?.stack,
      }
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
    } catch (logError) {
      console.error('Errore nel logging:', logError)
    }
    return NextResponse.json(
      { 
        error: 'Errore nel salvataggio impostazioni spedizione',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

