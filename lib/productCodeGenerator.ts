// Utility per generare codice prodotto univoco

import { prisma } from '@/lib/prisma'

/**
 * Genera un codice prodotto univoco automaticamente
 * Formato: PRD-YYYYMMDD-XXXX (es. PRD-20240110-1234)
 * Oppure basato su categoria: CAT-YYYYMMDD-XXXX (es. FILT-20240110-1234)
 */
export async function generateProductCode(categorySlug?: string | null, categoryId?: string | null): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  // Prefisso basato su categoria se fornita (primi 4 caratteri della categoria)
  let prefix = 'PRD'
  
  if (categoryId) {
    // Se abbiamo categoryId, recupera il nome della categoria
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { slug: true, name: true },
    })
    
    if (category) {
      // Usa i primi 4 caratteri del nome categoria in maiuscolo
      prefix = category.slug.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 
               category.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 
               'PRD'
    }
  } else if (categorySlug) {
    // Usa i primi 4 caratteri dello slug categoria
    prefix = categorySlug.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD'
  }

  // Genera parte numerica randomica (4 cifre)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  // Formato: PREFIX-YYYYMMDD-XXXX (es. PRD-20240110-1234 o FILT-20240110-1234)
  let generatedCode = `${prefix}-${year}${month}${day}-${random}`
  
  // Limita tentativi di generazione per evitare loop infiniti
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    // Verifica che il codice sia univoco
    const exists = await prisma.product.findUnique({
      where: { sku: generatedCode },
    })

    if (!exists) {
      return generatedCode
    }

    // Se esiste, genera un nuovo codice con un numero random diverso
    const newRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    generatedCode = `${prefix}-${year}${month}${day}-${newRandom}`
    attempts++
  }

  // Se dopo maxAttempts tentativi non troviamo un codice univoco, usa timestamp
  const timestamp = Date.now().toString().slice(-6)
  return `${prefix}-${year}${month}${day}-${timestamp}`
}

/**
 * Verifica se un codice prodotto è già in uso
 */
export async function isProductCodeUnique(code: string): Promise<boolean> {
  const exists = await prisma.product.findUnique({
    where: { sku: code },
  })

  return !exists
}

