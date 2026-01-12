import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Lista prodotti pubblici (solo attivi e disponibili)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const category = searchParams.get('category') // Nome categoria
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const inStock = searchParams.get('inStock') // 'true' o 'false'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined

    // Verifica se includere prodotti inattivi (solo per admin)
    const includeInactive = request.headers.get('x-include-inactive') === 'true'
    const userId = request.headers.get('x-user-id')

    // Se è un admin, permette di vedere prodotti inattivi
    let isAdmin = false
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
    }

    // Costruisci filtro where
    const where: any = {}
    
    // Solo prodotti attivi nel catalogo pubblico (se non è admin o non ha richiesto includeInactive)
    if (!includeInactive && !isAdmin) {
      where.active = true
    }

    // Filtro per categoria (ID o nome)
    if (categoryId) {
      where.categoryId = categoryId
    } else if (category) {
      // Cerca categoria per nome o slug (SQLite non supporta mode: 'insensitive', usiamo toLowerCase)
      const categoryLower = category.toLowerCase()
      const categoryRecord = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { contains: category } },
            { slug: { contains: categoryLower } },
          ],
        },
      })
      if (categoryRecord) {
        where.categoryId = categoryRecord.id
      }
    }

    // Filtro per ricerca (nome, descrizione, marca, codice, compatibilità)
    // PostgreSQL supporta mode: 'insensitive' per case-insensitive search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search } },
        { compatibility: { contains: search } },
        { sku: { contains: search } },
      ]
    }

    // Filtro per prezzo
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) {
        where.price.gte = parseFloat(minPrice)
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice)
      }
    }

    // Filtro per disponibilità
    if (inStock === 'true') {
      where.inStock = true
      where.stockQuantity = { gt: 0 }
    } else if (inStock === 'false') {
      where.OR = [
        { inStock: false },
        { stockQuantity: 0 },
      ]
    }

    // Se includeInactive è true, rimuovi il filtro active (mostra tutti)
    if (includeInactive && where.active === true) {
      delete where.active
    }

    // Query prodotti con include di categoria e tipo prodotto
    const products = await prisma.product.findMany({
      where,
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
        createdAt: 'desc',
      },
      take: limit,
      skip: skip,
    })

    // Converti al formato Product per il client
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      vatRate: product.vatRate || undefined,
      image: product.image,
      category: product.category.name, // Nome categoria come stringa
      categoryId: product.category.id,
      productType: product.productType?.slug || product.productTypeId,
      productTypeId: product.productTypeId,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand,
      partNumber: product.partNumber,
      compatibility: product.compatibility,
      sku: product.sku, // Codice prodotto univoco
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      active: product.active,
      featured: product.featured || false,
      technicalSheet: product.technicalSheet,
      height: product.height || undefined,
      width: product.width || undefined,
      depth: product.depth || undefined,
      weight: product.weight || undefined,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }))

    // Conta totale prodotti per paginazione
    const total = await prisma.product.count({ where })

    return NextResponse.json(
      {
        products: formattedProducts,
        total,
        limit,
        skip,
        hasMore: limit ? skip! + limit < total : false,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero prodotti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prodotti', details: error.message },
      { status: 500 }
    )
  }
}

