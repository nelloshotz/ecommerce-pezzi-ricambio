import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Dettaglio prodotto singolo (solo attivi nel catalogo pubblico)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        productType: {
          select: {
            id: true,
            name: true,
            slug: true,
            config: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    // Verifica che il prodotto sia attivo (per catalogo pubblico)
    // Se si vuole vedere anche prodotti inattivi, verificare header o query param
    const includeInactive = request.headers.get('x-include-inactive') === 'true'

    if (!product.active && !includeInactive) {
      return NextResponse.json(
        { error: 'Prodotto non disponibile' },
        { status: 404 }
      )
    }

    // Converti al formato Product per il client
    const formattedProduct = {
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
      productTypeConfig: product.productType?.config
        ? JSON.parse(product.productType.config)
        : null,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand,
      partNumber: product.partNumber,
      compatibility: product.compatibility,
      sku: product.sku, // Codice prodotto univoco
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity || undefined,
      lowStockThreshold: product.lowStockThreshold || undefined,
      active: product.active,
      featured: product.featured || false,
      technicalSheet: product.technicalSheet || undefined,
      height: product.height || undefined,
      width: product.width || undefined,
      depth: product.depth || undefined,
      weight: product.weight || undefined,
      slug: product.slug,
      metadata: product.metadata ? JSON.parse(product.metadata) : {},
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      // Informazioni categoria e tipo prodotto
      categoryInfo: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        description: product.category.description,
      },
      productTypeInfo: product.productType
        ? {
            id: product.productType.id,
            name: product.productType.name,
            slug: product.productType.slug,
            config: JSON.parse(product.productType.config),
          }
        : null,
    }

    return NextResponse.json({ product: formattedProduct }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel recupero prodotto:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prodotto', details: error.message },
      { status: 500 }
    )
  }
}

