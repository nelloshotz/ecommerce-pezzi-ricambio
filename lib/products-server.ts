// Funzioni server-side per prodotti (usano Prisma direttamente)
// Da usare in Server Components di Next.js

import { prisma } from '@/lib/prisma'
import { Product } from '@/types'

/**
 * Ottiene tutti i prodotti (inclusi quelli inattivi - solo per admin)
 * Versione server-side che usa Prisma direttamente
 */
export async function getAllProductsServer(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: {}, // Tutti i prodotti
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
    })

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category.name,
      categoryId: product.category.id,
      productType: product.productType?.slug || undefined,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand || undefined,
      partNumber: product.partNumber || undefined,
      sku: product.sku || undefined,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity || undefined,
      active: product.active,
      featured: product.featured || false,
      technicalSheet: product.technicalSheet || undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }))
  } catch (error) {
    console.error('Errore nel recupero prodotti (server):', error)
    return []
  }
}

/**
 * Ottiene solo i prodotti attivi (per lo store pubblico)
 * Versione server-side che usa Prisma direttamente
 */
export async function getProductsServer(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        active: true, // Solo prodotti attivi
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
        createdAt: 'desc',
      },
    })

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category.name,
      categoryId: product.category.id,
      productType: product.productType?.slug || undefined,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand || undefined,
      partNumber: product.partNumber || undefined,
      sku: product.sku || undefined,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity || undefined,
      active: product.active,
      featured: product.featured || false,
      technicalSheet: product.technicalSheet || undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }))
  } catch (error) {
    console.error('Errore nel recupero prodotti (server):', error)
    return []
  }
}

/**
 * Ottiene prodotto per ID
 * Versione server-side che usa Prisma direttamente
 */
export async function getProductByIdServer(id: string, includeInactive = false): Promise<Product | null> {
  try {
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
      return null
    }

    // Verifica che il prodotto sia attivo se non includiamo inattivi
    if (!product.active && !includeInactive) {
      return null
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category.name,
      categoryId: product.category.id,
      productType: product.productType?.slug || undefined,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand || undefined,
      partNumber: product.partNumber || undefined,
      sku: product.sku || undefined,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity || undefined,
      active: product.active,
      featured: product.featured || false,
      technicalSheet: product.technicalSheet || undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }
  } catch (error) {
    console.error('Errore nel recupero prodotto (server):', error)
    return null
  }
}

/**
 * Ottiene categorie
 * Versione server-side che usa Prisma direttamente
 */
export async function getCategoriesServer(): Promise<string[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    })

    return categories.map((cat) => cat.name).sort()
  } catch (error) {
    console.error('Errore nel recupero categorie (server):', error)
    return []
  }
}

