import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Ricerca avanzata prodotti
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query') || ''
    const categoryId = searchParams.get('categoryId')
    const brand = searchParams.get('brand')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const inStock = searchParams.get('inStock') // 'true', 'false', o null
    const sortBy = searchParams.get('sortBy') || 'relevance' // 'relevance', 'price-asc', 'price-desc', 'name-asc', 'name-desc', 'newest'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0

    // Costruisci filtro where
    const where: any = {
      active: true, // Solo prodotti attivi
    }

    // Ricerca testuale (PostgreSQL supporta mode: 'insensitive' per case-insensitive)
    if (query.trim()) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { partNumber: { contains: query, mode: 'insensitive' } },
        { compatibility: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Filtro categoria (se presente, applica sempre)
    if (categoryId) {
      where.categoryId = categoryId
    }

    // Filtro brand (PostgreSQL supporta mode: 'insensitive')
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' }
    }

    // Filtro prezzo
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) {
        where.price.gte = parseFloat(minPrice)
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice)
      }
    }

    // Filtro disponibilità (gestisci OR esistente se presente)
    if (inStock === 'true') {
      where.inStock = true
      where.stockQuantity = { gt: 0 }
    } else if (inStock === 'false') {
      // Se c'è già un OR per la ricerca, combina i filtri
      if (where.OR) {
        const existingOR = where.OR
        where.AND = [
          { OR: existingOR },
          {
            OR: [
              { inStock: false },
              { stockQuantity: 0 },
            ],
          },
        ]
        delete where.OR
      } else {
        where.OR = [
          { inStock: false },
          { stockQuantity: 0 },
        ]
      }
    }

    // Ordinamento
    let orderBy: any = { createdAt: 'desc' } // Default: più recenti

    switch (sortBy) {
      case 'price-asc':
        orderBy = { price: 'asc' }
        break
      case 'price-desc':
        orderBy = { price: 'desc' }
        break
      case 'name-asc':
        orderBy = { name: 'asc' }
        break
      case 'name-desc':
        orderBy = { name: 'desc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'relevance':
        // Per ora ordiniamo per nome se c'è una query, altrimenti per data
        orderBy = query.trim() ? { name: 'asc' } : { createdAt: 'desc' }
        break
    }

    // Query prodotti
    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
        orderBy,
        take: limit,
        skip: skip,
      }),
      prisma.product.count({ where }),
    ])

    // Converti al formato Product per il client
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      vatRate: product.vatRate || undefined,
      image: product.image,
      category: product.category.name,
      categoryId: product.category.id,
      productType: product.productType?.slug || product.productTypeId,
      productTypeId: product.productTypeId,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand,
      partNumber: product.partNumber,
      compatibility: product.compatibility,
      sku: product.sku,
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

    // Suggerimenti ricerca migliorati (usa endpoint autocomplete se disponibile)
    let suggestions: string[] = []
    if (query.trim() && query.length >= 2) {
      try {
        // Cerca prodotti, brand e categorie per suggerimenti
        const [matchingProducts, allCategories, allBrands] = await Promise.all([
          prisma.product.findMany({
            where: {
              active: true,
              OR: [
                { name: { contains: query } },
                { sku: { contains: query } },
                { partNumber: { contains: query } },
              ],
            },
            select: { name: true },
            take: 3,
          }),
          prisma.category.findMany({
            where: { active: true },
            select: { name: true },
          }),
          prisma.product.findMany({
            where: { active: true, brand: { not: null } },
            select: { brand: true },
            distinct: ['brand'],
          }),
        ])

        const queryLower = query.toLowerCase()
        
        // Aggiungi nomi prodotti
        matchingProducts.forEach((p) => {
          if (!suggestions.includes(p.name)) {
            suggestions.push(p.name)
          }
        })

        // Aggiungi categorie corrispondenti
        const matchingCategories = allCategories
          .filter((cat) => cat.name.toLowerCase().includes(queryLower))
          .slice(0, 3)
          .map((cat) => cat.name)
        matchingCategories.forEach((cat) => {
          if (!suggestions.includes(cat)) {
            suggestions.push(cat)
          }
        })

        // Aggiungi brand corrispondenti
        const matchingBrands = allBrands
          .map((p) => p.brand)
          .filter((brand): brand is string => brand !== null && brand.toLowerCase().includes(queryLower))
          .slice(0, 2)
        matchingBrands.forEach((brand) => {
          if (!suggestions.includes(brand)) {
            suggestions.push(brand)
          }
        })
      } catch (error) {
        console.error('Errore nel recupero suggerimenti:', error)
      }
    }

    return NextResponse.json(
      {
        products: formattedProducts,
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
        suggestions,
        query,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nella ricerca prodotti:', error)
    return NextResponse.json(
      { error: 'Errore nella ricerca prodotti', details: error.message },
      { status: 500 }
    )
  }
}

