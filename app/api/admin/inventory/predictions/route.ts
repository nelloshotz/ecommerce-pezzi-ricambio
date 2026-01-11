import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Previsioni esaurimento stock basate su vendite medie
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

    // Recupera impostazioni inventario
    const settings = await prisma.inventorySettings.findFirst({
      where: { isActive: true },
    })

    if (!settings || !settings.enableStockPredictions) {
      return NextResponse.json({
        predictions: [],
        settings: settings || null,
        message: 'Previsioni non abilitate',
      })
    }

    const daysForAverage = settings.daysForSalesAverage || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysForAverage)

    // Recupera tutti i prodotti attivi con stock > 0
    const products = await prisma.product.findMany({
      where: {
        active: true,
        stockQuantity: { gt: 0 },
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    })

    const predictions = []

    for (const product of products) {
      // Calcola vendite medie degli ultimi N giorni
      const salesMovements = await prisma.inventoryMovement.findMany({
        where: {
          productId: product.id,
          type: 'SALE',
          createdAt: { gte: cutoffDate },
        },
      })

      // Calcola quantità totale venduta (movimenti negativi)
      const totalSold = Math.abs(
        salesMovements.reduce((sum, movement) => sum + movement.quantity, 0)
      )

      // Media giornaliera vendite
      const dailyAverage = daysForAverage > 0 ? totalSold / daysForAverage : 0

      // Se non ci sono vendite, salta
      if (dailyAverage === 0 || totalSold === 0) {
        continue
      }

      // Calcola giorni stimati fino all'esaurimento
      const daysUntilOutOfStock = product.stockQuantity / dailyAverage

      // Aggiungi previsione solo se esaurimento previsto entro 60 giorni
      if (daysUntilOutOfStock <= 60) {
        const predictedDate = new Date()
        predictedDate.setDate(predictedDate.getDate() + Math.ceil(daysUntilOutOfStock))

        predictions.push({
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            partNumber: product.partNumber,
            brand: product.brand,
            category: product.category.name,
          },
          currentStock: product.stockQuantity,
          totalSoldLastPeriod: totalSold,
          dailyAverage: parseFloat(dailyAverage.toFixed(2)),
          daysUntilOutOfStock: Math.ceil(daysUntilOutOfStock),
          predictedOutOfStockDate: predictedDate.toISOString(),
          riskLevel: daysUntilOutOfStock <= 7 ? 'CRITICAL' : daysUntilOutOfStock <= 14 ? 'HIGH' : daysUntilOutOfStock <= 30 ? 'MEDIUM' : 'LOW',
        })
      }
    }

    // Ordina per rischio (critical first) e poi per giorni fino all'esaurimento
    predictions.sort((a, b) => {
      const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      if (riskOrder[a.riskLevel as keyof typeof riskOrder] !== riskOrder[b.riskLevel as keyof typeof riskOrder]) {
        return riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder]
      }
      return a.daysUntilOutOfStock - b.daysUntilOutOfStock
    })

    return NextResponse.json({
      predictions,
      settings: {
        daysForSalesAverage: settings.daysForSalesAverage,
        enableStockPredictions: settings.enableStockPredictions,
      },
      period: {
        days: daysForAverage,
        from: cutoffDate.toISOString(),
        to: new Date().toISOString(),
      },
      summary: {
        totalProductsAnalyzed: products.length,
        productsWithPredictions: predictions.length,
        critical: predictions.filter((p) => p.riskLevel === 'CRITICAL').length,
        high: predictions.filter((p) => p.riskLevel === 'HIGH').length,
        medium: predictions.filter((p) => p.riskLevel === 'MEDIUM').length,
        low: predictions.filter((p) => p.riskLevel === 'LOW').length,
      },
    })
  } catch (error: any) {
    console.error('Errore nel calcolo previsioni stock:', error)
    return NextResponse.json(
      { error: 'Errore nel calcolo previsioni stock', details: error.message },
      { status: 500 }
    )
  }
}

