import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Autocomplete avanzato per ricerca prodotti
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query') || ''
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10

    if (!query.trim() || query.length < 2) {
      return NextResponse.json(
        {
          suggestions: [],
          products: [],
          brands: [],
          categories: [],
        },
        { status: 200 }
      )
    }

    const queryLower = query.toLowerCase().trim()

    // Cerca prodotti che corrispondono alla query
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { partNumber: { contains: query } },
          { brand: { contains: query } },
          { compatibility: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        partNumber: true,
        brand: true,
        price: true,
        vatRate: true,
        image: true,
        inStock: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { inStock: 'desc' }, // Prima prodotti disponibili
        { name: 'asc' },
      ],
    })

    // Cerca brand che corrispondono
    const allProducts = await prisma.product.findMany({
      where: { active: true, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
    })
    const brands = allProducts
      .map((p) => p.brand)
      .filter((brand): brand is string => brand !== null && brand.toLowerCase().includes(queryLower))
      .slice(0, 5)

    // Cerca categorie che corrispondono
    const categories = await prisma.category.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query } },
          { slug: { contains: queryLower } },
        ],
      },
      select: {
        name: true,
        slug: true,
      },
      take: 5,
    })

    // Formatta suggerimenti combinati (nomi prodotti, brand, categorie)
    const suggestions: string[] = []
    
    // Aggiungi nomi prodotti (max 5)
    products.slice(0, 5).forEach((product) => {
      if (product.name.toLowerCase().includes(queryLower) && !suggestions.includes(product.name)) {
        suggestions.push(product.name)
      }
    })

    // Aggiungi brand
    brands.forEach((brand) => {
      if (!suggestions.includes(brand)) {
        suggestions.push(brand)
      }
    })

    // Aggiungi categorie
    categories.forEach((category) => {
      if (!suggestions.includes(category.name)) {
        suggestions.push(category.name)
      }
    })

    return NextResponse.json(
      {
        suggestions: suggestions.slice(0, 10),
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          partNumber: p.partNumber,
          brand: p.brand,
          price: p.price,
          vatRate: p.vatRate || undefined,
          image: p.image,
          inStock: p.inStock,
          category: p.category.name,
        })),
        brands: brands.slice(0, 5),
        categories: categories.map((c) => ({
          name: c.name,
          slug: c.slug,
        })),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'autocomplete:', error)
    return NextResponse.json(
      {
        error: 'Errore nell\'autocomplete',
        details: error.message,
        suggestions: [],
        products: [],
        brands: [],
        categories: [],
      },
      { status: 500 }
    )
  }
}

