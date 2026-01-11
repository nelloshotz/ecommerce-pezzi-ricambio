import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Ottieni impostazioni inventario
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    // Cerca impostazioni esistenti o crea default
    let settings = await prisma.inventorySettings.findFirst({
      where: { isActive: true },
    })

    if (!settings) {
      // Crea impostazioni default se non esistono
      settings = await prisma.inventorySettings.create({
        data: {
          lowStockThreshold: 10,
          criticalStockThreshold: 5,
          enableLowStockAlerts: true,
          enableStockPredictions: true,
          daysForSalesAverage: 30,
          isActive: true,
        },
      })
    }

    return NextResponse.json({ settings }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel recupero impostazioni inventario:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero impostazioni', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna impostazioni inventario
export async function PUT(request: NextRequest) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      lowStockThreshold,
      criticalStockThreshold,
      enableLowStockAlerts,
      enableStockPredictions,
      notificationEmail,
      daysForSalesAverage,
      isActive,
    } = body

    // Valida input
    if (lowStockThreshold !== undefined && (lowStockThreshold < 0 || !Number.isInteger(lowStockThreshold))) {
      return NextResponse.json(
        { error: 'lowStockThreshold deve essere un intero positivo' },
        { status: 400 }
      )
    }

    if (criticalStockThreshold !== undefined && (criticalStockThreshold < 0 || !Number.isInteger(criticalStockThreshold))) {
      return NextResponse.json(
        { error: 'criticalStockThreshold deve essere un intero positivo' },
        { status: 400 }
      )
    }

    // Trova o crea impostazioni
    let settings = await prisma.inventorySettings.findFirst({
      where: { isActive: true },
    })

    if (settings) {
      // Aggiorna impostazioni esistenti
      settings = await prisma.inventorySettings.update({
        where: { id: settings.id },
        data: {
          ...(lowStockThreshold !== undefined && { lowStockThreshold }),
          ...(criticalStockThreshold !== undefined && { criticalStockThreshold }),
          ...(enableLowStockAlerts !== undefined && { enableLowStockAlerts }),
          ...(enableStockPredictions !== undefined && { enableStockPredictions }),
          ...(notificationEmail !== undefined && { notificationEmail }),
          ...(daysForSalesAverage !== undefined && { daysForSalesAverage: Math.max(1, Math.min(365, daysForSalesAverage || 30)) }),
          ...(isActive !== undefined && { isActive }),
        },
      })
    } else {
      // Crea nuove impostazioni
      settings = await prisma.inventorySettings.create({
        data: {
          lowStockThreshold: lowStockThreshold || 10,
          criticalStockThreshold: criticalStockThreshold || 5,
          enableLowStockAlerts: enableLowStockAlerts !== undefined ? enableLowStockAlerts : true,
          enableStockPredictions: enableStockPredictions !== undefined ? enableStockPredictions : true,
          notificationEmail: notificationEmail || null,
          daysForSalesAverage: daysForSalesAverage || 30,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
    }

    return NextResponse.json(
      { message: 'Impostazioni inventario aggiornate', settings },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento impostazioni inventario:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento impostazioni', details: error.message },
      { status: 500 }
    )
  }
}

