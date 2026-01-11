import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Ottieni prodotti con scorte basse/critiche
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

    if (!settings || !settings.enableLowStockAlerts) {
      return NextResponse.json({
        lowStockProducts: [],
        criticalStockProducts: [],
        settings: settings || null,
      })
    }

    const lowThreshold = settings.lowStockThreshold || 10
    const criticalThreshold = settings.criticalStockThreshold || 5

    // Recupera tutti i prodotti attivi per controllare anche il lowStockThreshold individuale
    const allProducts = await prisma.product.findMany({
      where: {
        active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    // Filtra prodotti con stock sotto la soglia (globale o individuale)
    const lowStockProducts: typeof allProducts = []
    const criticalStockProducts: typeof allProducts = []
    const processedIds = new Set<string>()

    for (const product of allProducts) {
      // Evita duplicati
      if (processedIds.has(product.id)) continue

      // Controlla se il prodotto ha raggiunto la sua soglia individuale
      const hasReachedThreshold = product.lowStockThreshold !== null && 
                                   product.lowStockThreshold !== undefined &&
                                   product.stockQuantity <= product.lowStockThreshold

      // Controlla anche le soglie globali
      const isCriticalStock = product.stockQuantity <= criticalThreshold
      const isLowStock = product.stockQuantity <= lowThreshold && product.stockQuantity > criticalThreshold

      // Priorità: critico > soglia individuale > basso globale
      if (isCriticalStock || (hasReachedThreshold && product.stockQuantity <= criticalThreshold)) {
        criticalStockProducts.push(product)
        processedIds.add(product.id)
      } else if (hasReachedThreshold || isLowStock) {
        lowStockProducts.push(product)
        processedIds.add(product.id)
      }
    }

    // Ordina per stock quantity
    lowStockProducts.sort((a, b) => a.stockQuantity - b.stockQuantity)
    criticalStockProducts.sort((a, b) => a.stockQuantity - b.stockQuantity)

    return NextResponse.json({
      lowStockProducts,
      criticalStockProducts,
      settings: {
        lowStockThreshold: settings.lowStockThreshold,
        criticalStockThreshold: settings.criticalStockThreshold,
        enableLowStockAlerts: settings.enableLowStockAlerts,
      },
      counts: {
        lowStock: lowStockProducts.length,
        critical: criticalStockProducts.length,
        total: lowStockProducts.length + criticalStockProducts.length,
      },
    })
  } catch (error: any) {
    console.error('Errore nel recupero alert stock:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero alert stock', details: error.message },
      { status: 500 }
    )
  }
}

