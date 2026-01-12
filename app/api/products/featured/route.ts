import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Ottiene prodotti per la homepage seguendo logica: featured -> più venduti -> random
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 8

    // 1. Prima cerca prodotti con flag featured
    let products = await prisma.product.findMany({
      where: {
        featured: true,
        active: true,
        inStock: true,
        stockQuantity: { gt: 0 },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        productType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Più recenti prima
      },
      take: limit,
    })

    // 2. Se non ci sono abbastanza prodotti featured, cerca i più venduti
    if (products.length < limit) {
      const featuredIds = products.map((p) => p.id)

      // Calcola vendite per prodotto tramite OrderItem (solo ordini pagati)
      // PostgreSQL supporta groupBy, ma manteniamo questa logica per compatibilità
      // Prima prendiamo tutti gli ordini pagati
      const paidOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
        },
        select: { id: true },
      })

      const paidOrderIds = paidOrders.map((o) => o.id)

      if (paidOrderIds.length > 0) {
        const orderItems = await prisma.orderItem.findMany({
          where: {
            productId: { notIn: featuredIds },
            orderId: { in: paidOrderIds },
          },
          select: {
            productId: true,
            quantity: true,
          },
        })

        // Raggruppa per productId e somma le quantità
        const productSales: Record<string, number> = {}
        for (const item of orderItems) {
          productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity
        }

        // Ordina per vendite (decrescente) e prendi i primi
        const topSellingProductIds = Object.entries(productSales)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit - products.length)
          .map(([productId]) => productId)

        if (topSellingProductIds.length > 0) {
          const topProducts = await prisma.product.findMany({
            where: {
              id: { in: topSellingProductIds },
              active: true,
              inStock: true,
              stockQuantity: { gt: 0 },
              featured: false, // Non includere quelli già featured
            },
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              productType: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          })

          // Ordina secondo l'ordine di vendita (mantieni ordine vendite)
          const sortedTopProducts = topSellingProductIds
            .map((id) => topProducts.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined)

          products = [...products, ...sortedTopProducts]
        }
      }
    }

    // 3. Se ancora non ci sono abbastanza, aggiungi prodotti random
    if (products.length < limit) {
      const existingIds = products.map((p) => p.id)

      const randomProducts = await prisma.product.findMany({
        where: {
          id: { notIn: existingIds },
          active: true,
          inStock: true,
          stockQuantity: { gt: 0 },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          productType: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: limit - products.length,
      })

      // Ordina random
      const shuffled = randomProducts.sort(() => Math.random() - 0.5)
      products = [...products, ...shuffled]
    }

    // Limita al numero richiesto
    products = products.slice(0, limit)

    // Formatta risposta
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      vatRate: product.vatRate || undefined,
      image: product.image,
      category: product.category.name,
      categoryId: product.category.id,
      productType: product.productType?.slug || product.productTypeId || undefined,
      productTypeId: product.productTypeId || undefined,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand || undefined,
      partNumber: product.partNumber || undefined,
      compatibility: product.compatibility || undefined,
      sku: product.sku || undefined,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity || undefined,
      active: product.active,
      featured: product.featured,
      technicalSheet: product.technicalSheet || undefined,
      height: product.height || undefined,
      width: product.width || undefined,
      depth: product.depth || undefined,
      weight: product.weight || undefined,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }))

    return NextResponse.json(
      {
        products: formattedProducts,
        total: formattedProducts.length,
        limit,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero prodotti featured:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prodotti featured', details: error.message },
      { status: 500 }
    )
  }
}

