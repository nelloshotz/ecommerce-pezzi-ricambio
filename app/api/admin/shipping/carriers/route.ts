import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import shippingConfigDefault from '@/lib/shipping-config.json'
import fs from 'fs'
import path from 'path'

// GET - Recupera configurazione corrieri
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

    // Recupera configurazione attiva
    let config
    try {
      config = await prisma.carrierConfig.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      })
    } catch (dbError: any) {
      console.error('Errore database CarrierConfig:', dbError)
      // Log nel file
      try {
        const logDir = path.join(process.cwd(), 'logs')
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true })
        }
        const logFile = path.join(logDir, 'admin-profilo-errors.log')
        const logEntry = {
          timestamp: new Date().toISOString(),
          source: 'admin/shipping/carriers',
          error: 'Errore database CarrierConfig',
          details: dbError?.message || String(dbError),
          stack: dbError?.stack,
        }
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
      } catch (logError) {
        console.error('Errore nel logging:', logError)
      }
      // Se c'è un errore con il database, usa la configurazione di default
      return NextResponse.json(
        {
          config: shippingConfigDefault,
          isDefault: true,
          warning: 'Usando configurazione di default (errore database)',
        },
        { status: 200 }
      )
    }

    if (!config) {
      // Se non c'è configurazione, usa quella di default dal JSON
      console.log('Nessuna configurazione nel DB, uso default')
      return NextResponse.json(
        {
          config: shippingConfigDefault,
          isDefault: true,
        },
        { status: 200 }
      )
    }

    try {
      const parsedConfig = JSON.parse(config.config)
      return NextResponse.json(
        {
          config: parsedConfig,
          isDefault: false,
        },
        { status: 200 }
      )
    } catch (parseError: any) {
      console.error('Errore parsing JSON config:', parseError)
      // Log nel file
      try {
        const logDir = path.join(process.cwd(), 'logs')
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true })
        }
        const logFile = path.join(logDir, 'admin-profilo-errors.log')
        const logEntry = {
          timestamp: new Date().toISOString(),
          source: 'admin/shipping/carriers',
          error: 'Errore parsing JSON config',
          details: parseError?.message || String(parseError),
          stack: parseError?.stack,
        }
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
      } catch (logError) {
        console.error('Errore nel logging:', logError)
      }
      // Se il JSON nel DB è corrotto, usa la configurazione di default
      return NextResponse.json(
        {
          config: shippingConfigDefault,
          isDefault: true,
          warning: 'Configurazione DB corrotta, usando default',
        },
        { status: 200 }
      )
    }
  } catch (error: any) {
    console.error('Errore nel recupero configurazione corrieri:', error)
    // Log nel file
    try {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      const logFile = path.join(logDir, 'admin-profilo-errors.log')
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'admin/shipping/carriers',
        error: 'Errore nel recupero configurazione corrieri',
        details: error?.message || String(error),
        stack: error?.stack,
      }
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
    } catch (logError) {
      console.error('Errore nel logging:', logError)
    }
    return NextResponse.json(
      { 
        error: 'Errore nel recupero configurazione corrieri',
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Salva configurazione corrieri
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
    const { config } = body

    if (!config) {
      return NextResponse.json(
        { error: 'Configurazione mancante' },
        { status: 400 }
      )
    }

    // Valida che sia un JSON valido
    let parsedConfig
    try {
      parsedConfig = typeof config === 'string' ? JSON.parse(config) : config
    } catch (e) {
      return NextResponse.json(
        { error: 'Configurazione non valida (JSON non valido)' },
        { status: 400 }
      )
    }

    // Valida struttura base
    if (!parsedConfig.gls || !parsedConfig.brt || !parsedConfig.poste_italiane) {
      return NextResponse.json(
        { error: 'Configurazione incompleta. Devono essere presenti: gls, brt, poste_italiane' },
        { status: 400 }
      )
    }

    // Disattiva tutte le configurazioni esistenti
    await prisma.carrierConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Crea nuova configurazione attiva
    const newConfig = await prisma.carrierConfig.create({
      data: {
        config: JSON.stringify(parsedConfig),
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        config: parsedConfig,
        isDefault: false,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel salvataggio configurazione corrieri:', error)
    // Log nel file
    try {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      const logFile = path.join(logDir, 'admin-profilo-errors.log')
      const logEntry = {
        timestamp: new Date().toISOString(),
        source: 'admin/shipping/carriers',
        error: 'Errore nel salvataggio configurazione corrieri',
        details: error?.message || String(error),
        stack: error?.stack,
      }
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n')
    } catch (logError) {
      console.error('Errore nel logging:', logError)
    }
    return NextResponse.json(
      { error: 'Errore nel salvataggio configurazione corrieri', details: error.message },
      { status: 500 }
    )
  }
}

