import { Product } from '@/types'

// Funzioni per interagire con le API route dei prodotti
// I dati mock sono stati sostituiti con chiamate alle API route

// Dati mock mantenuti solo per retrocompatibilità (non più utilizzati)
export const mockProducts: Product[] = []

// Funzione per aggiornare la quantità di un prodotto (quando viene venduto o rifornito)
export async function updateProductStock(
  productId: string,
  quantityChange: number
): Promise<Product | null> {
  const products = await getAllProducts()
  const product = products.find((p) => p.id === productId)
  
  if (!product) return null

  product.stockQuantity = Math.max(0, product.stockQuantity + quantityChange)
  product.inStock = product.stockQuantity > 0
  product.updatedAt = new Date()

  // In produzione salvare nel database
  return product
}

// Funzione per aggiornare manualmente la quantità (admin)
export async function setProductStock(
  productId: string,
  quantity: number
): Promise<Product | null> {
  const products = await getAllProducts()
  const product = products.find((p) => p.id === productId)
  
  if (!product) return null

  product.stockQuantity = Math.max(0, quantity)
  product.inStock = product.stockQuantity > 0
  product.updatedAt = new Date()

  // In produzione salvare nel database
  return product
}

// Funzione per ottenere tutti i prodotti (inclusi quelli inattivi - solo per admin)
export async function getAllProducts(): Promise<Product[]> {
  try {
    // Chiamata API con header per includere prodotti inattivi
    const response = await fetch('/api/products?includeInactive=true', {
      headers: {
        'x-include-inactive': 'true',
      },
      cache: 'no-store', // Non cachare in sviluppo
    })

    if (!response.ok) {
      throw new Error('Errore nel caricamento prodotti')
    }

    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error('Errore nel recupero prodotti:', error)
    return []
  }
}

// Funzione per ottenere solo i prodotti attivi (per lo store pubblico)
export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/products', {
      cache: 'no-store', // Non cachare in sviluppo
    })

    if (!response.ok) {
      throw new Error('Errore nel caricamento prodotti')
    }

    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error('Errore nel recupero prodotti:', error)
    return []
  }
}

export async function getProductById(id: string, includeInactive = false): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      headers: includeInactive
        ? {
            'x-include-inactive': 'true',
          }
        : {},
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Errore nel caricamento prodotto')
    }

    const data = await response.json()
    return data.product || null
  } catch (error) {
    console.error('Errore nel recupero prodotto:', error)
    return null
  }
}

export async function getProductsByCategory(category: string, includeInactive = false): Promise<Product[]> {
  try {
    const response = await fetch(`/api/products?category=${encodeURIComponent(category)}`, {
      headers: includeInactive
        ? {
            'x-include-inactive': 'true',
          }
        : {},
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Errore nel caricamento prodotti per categoria')
    }

    const data = await response.json()
    return data.products || []
  } catch (error) {
    console.error('Errore nel recupero prodotti per categoria:', error)
    return []
  }
}

export async function getCategories(): Promise<string[]> {
  try {
    const response = await fetch('/api/categories', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Errore nel caricamento categorie')
    }

    const data = await response.json()
    // Restituisci array di nomi categorie
    return (data.categories || []).map((cat: any) => cat.name).sort()
  } catch (error) {
    console.error('Errore nel recupero categorie:', error)
    return []
  }
}

// Nuova funzione per ricerca prodotti
export async function searchProducts(query: string, filters?: {
  categoryId?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sortBy?: 'relevance' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'
  limit?: number
  skip?: number
}): Promise<{ products: Product[]; total: number; suggestions: string[] }> {
  try {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (filters?.categoryId) params.set('categoryId', filters.categoryId)
    if (filters?.brand) params.set('brand', filters.brand)
    if (filters?.minPrice) params.set('minPrice', filters.minPrice.toString())
    if (filters?.maxPrice) params.set('maxPrice', filters.maxPrice.toString())
    if (filters?.inStock !== undefined) params.set('inStock', filters.inStock.toString())
    if (filters?.sortBy) params.set('sortBy', filters.sortBy)
    if (filters?.limit) params.set('limit', filters.limit.toString())
    if (filters?.skip) params.set('skip', filters.skip.toString())

    const response = await fetch(`/api/products/search?${params.toString()}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Errore nella ricerca prodotti')
    }

    const data = await response.json()
    return {
      products: data.products || [],
      total: data.total || 0,
      suggestions: data.suggestions || [],
    }
  } catch (error) {
    console.error('Errore nella ricerca prodotti:', error)
    return { products: [], total: 0, suggestions: [] }
  }
}

