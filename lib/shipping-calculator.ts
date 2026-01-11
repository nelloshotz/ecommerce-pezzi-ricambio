import shippingConfig from './shipping-config.json'
import { prisma } from './prisma'
import { calculateShippingWithPackages, Package } from './shipping-packages'

interface ProductDimensions {
  id: string
  height?: number | null
  width?: number | null
  depth?: number | null
  weight?: number | null
  quantity: number
  name?: string
}

interface ShippingCalculation {
  carrier: string
  baseCost: number
  finalCost: number
  markupPercent: number
  format?: string // 'standard' o 'non_standard' per Poste Italiane
  packages?: Package[] // Info sui colli se multipli
  totalPackages?: number // Numero totale colli
  isFreeShipping?: boolean // Se true, spedizione gratuita (soglia raggiunta)
  freeShippingThreshold?: number | null // Soglia per spedizione gratuita
}

/**
 * Calcola le dimensioni totali del pacco combinando tutti i prodotti
 */
export function calculatePackageDimensions(products: ProductDimensions[]): {
  totalWeight: number
  maxSide: number // Lato massimo tra tutti i prodotti
  sumOfSides: number // Somma dei lati massimi di tutti i prodotti (approssimativa)
  maxHeight: number
  maxWidth: number
  maxDepth: number
} {
  let totalWeight = 0
  let maxHeight = 0
  let maxWidth = 0
  let maxDepth = 0

  // Calcola dimensioni totali e peso
  // Per le dimensioni, prendiamo il prodotto più grande (non moltiplichiamo per quantità)
  // Per il peso, sommiamo il peso di tutti i prodotti (peso × quantità)
  for (const product of products) {
    const weight = (product.weight || 0) * product.quantity
    totalWeight += weight

    // Per le dimensioni, prendiamo il singolo prodotto più grande
    // (assumiamo che prodotti multipli siano impacchettati insieme, non sovrapposti)
    maxHeight = Math.max(maxHeight, product.height || 0)
    maxWidth = Math.max(maxWidth, product.width || 0)
    maxDepth = Math.max(maxDepth, product.depth || 0)
  }

  // Lato massimo del singolo prodotto più grande
  const maxSide = Math.max(maxHeight, maxWidth, maxDepth)

  // Somma dei lati del prodotto più grande (approssimazione per pacchi combinati)
  // In realtà per pacchi multipli dovremmo calcolare meglio, ma questa è un'approssimazione
  const sumOfSides = maxHeight + maxWidth + maxDepth

  return {
    totalWeight,
    maxSide,
    sumOfSides,
    maxHeight,
    maxWidth,
    maxDepth,
  }
}

/**
 * Verifica se un pacco rientra nelle dimensioni Poste Italiane standard
 */
function isPosteStandard(packageDims: ReturnType<typeof calculatePackageDimensions>): boolean {
  return (
    packageDims.maxSide <= shippingConfig.poste_italiane.italia.formati.standard.dimensioni.lato_max_cm &&
    packageDims.sumOfSides <= shippingConfig.poste_italiane.italia.formati.standard.dimensioni.somma_lati_cm
  )
}

/**
 * Verifica se un pacco rientra nelle dimensioni Poste Italiane non standard
 */
function isPosteNonStandard(packageDims: ReturnType<typeof calculatePackageDimensions>): boolean {
  return (
    packageDims.maxSide <= shippingConfig.poste_italiane.italia.formati.non_standard.dimensioni.lato_max_cm &&
    packageDims.sumOfSides <= shippingConfig.poste_italiane.italia.formati.non_standard.dimensioni.somma_lati_cm
  )
}

/**
 * Calcola il prezzo per Poste Italiane in base al peso e formato
 */
function calculatePostePrice(
  weight: number,
  format: 'standard' | 'non_standard'
): number | null {
  const config =
    format === 'standard'
      ? shippingConfig.poste_italiane.italia.formati.standard
      : shippingConfig.poste_italiane.italia.formati.non_standard

  // Verifica limite peso
  if (weight > shippingConfig.poste_italiane.italia.peso_max_kg) {
    return null
  }

  // Trova la fascia di prezzo corretta
  for (const priceTier of config.prezzi_eur) {
    if (weight <= priceTier.max_kg) {
      return priceTier.prezzo
    }
  }

  return null
}

/**
 * Calcola il prezzo per BRT in base al peso
 */
function calculateBRTPrice(weight: number, packageDims: ReturnType<typeof calculatePackageDimensions>): number | null {
  const config = shippingConfig.brt.italia

  // Verifica limite peso
  if (weight > config.peso_max_kg) {
    return null
  }

  // Verifica dimensioni
  if (packageDims.maxSide > config.dimensioni.lato_max_cm || packageDims.sumOfSides > config.dimensioni.somma_lati_cm) {
    return null
  }

  // Trova la fascia di prezzo corretta
  for (const priceTier of config.prezzi_eur) {
    if (weight <= priceTier.max_kg) {
      return priceTier.prezzo
    }
  }

  return null
}

/**
 * Calcola il prezzo per GLS in base al peso
 */
function calculateGLSPrice(weight: number, packageDims: ReturnType<typeof calculatePackageDimensions>): number | null {
  const config = shippingConfig.gls.italia

  // Verifica limite peso
  if (weight > config.peso_max_kg) {
    return null
  }

  // Verifica dimensioni
  if (packageDims.maxSide > config.dimensioni.lato_max_cm || packageDims.sumOfSides > config.dimensioni.somma_lati_cm) {
    return null
  }

  // Trova la fascia di prezzo corretta
  for (const priceTier of config.prezzi_eur) {
    if (weight <= priceTier.max_kg) {
      return priceTier.prezzo
    }
  }

  return null
}

/**
 * Determina il corriere migliore in base alla logica:
 * - Se peso ≤ 10 kg e Italia → GLS
 * - Se peso > 10 kg → BRT
 * - Se pacco non standard o cliente retail → Poste Italiane
 */
function determineCarrier(
  weight: number,
  packageDims: ReturnType<typeof calculatePackageDimensions>
): { carrier: string; format?: string; price: number | null } {
  // Logica principale:
  // 1. Se peso ≤ 10 kg → GLS (se rientra nelle dimensioni)
  if (weight <= 10) {
    const glsPrice = calculateGLSPrice(weight, packageDims)
    if (glsPrice !== null) {
      return { carrier: 'GLS', price: glsPrice }
    }
  }

  // 2. Se peso > 10 kg → BRT (se rientra nelle dimensioni)
  if (weight > 10) {
    const brtPrice = calculateBRTPrice(weight, packageDims)
    if (brtPrice !== null) {
      return { carrier: 'BRT', price: brtPrice }
    }
  }

  // 3. Se non standard o non rientra in GLS/BRT → Poste Italiane
  // Prova prima standard, poi non standard
  if (isPosteStandard(packageDims)) {
    const postePrice = calculatePostePrice(weight, 'standard')
    if (postePrice !== null) {
      return { carrier: 'Poste Italiane', format: 'standard', price: postePrice }
    }
  }

  if (isPosteNonStandard(packageDims)) {
    const postePrice = calculatePostePrice(weight, 'non_standard')
    if (postePrice !== null) {
      return { carrier: 'Poste Italiane', format: 'non_standard', price: postePrice }
    }
  }

  // Fallback: usa Poste Italiane non standard come ultima risorsa
  // (anche se non rispetta le dimensioni, potrebbe essere accettato con costo extra)
  const postePrice = calculatePostePrice(Math.min(weight, 20), 'non_standard')
  if (postePrice !== null) {
    return { carrier: 'Poste Italiane', format: 'non_standard', price: postePrice }
  }

  // Se nessun corriere funziona, usa un prezzo di default (errore nel config)
  return { carrier: 'Poste Italiane', format: 'non_standard', price: 25.0 }
}

/**
 * Calcola il costo di spedizione per un ordine (con gestione multipli colli e soglia spedizione gratuita)
 * @param products Array di prodotti con dimensioni e quantità
 * @param subtotal Importo totale sottototale ordine (senza spedizione e sconti)
 * @returns Informazioni sul corriere, costo finale e dettagli colli
 */
export async function calculateShipping(
  products: ProductDimensions[],
  subtotal?: number
): Promise<ShippingCalculation> {
  // Recupera impostazioni spedizione dalle impostazioni admin
  let markupPercent = 0
  let freeShippingThreshold: number | null = null
  let fixedShippingPrice: number | null = null
  try {
    const shippingSettings = await prisma.shippingSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (shippingSettings) {
      markupPercent = shippingSettings.markupPercent
      freeShippingThreshold = shippingSettings.freeShippingThreshold
      fixedShippingPrice = shippingSettings.fixedShippingPrice
    }
  } catch (error) {
    console.error('Errore nel recupero impostazioni spedizione:', error)
    // Continua con valori di default se errore
  }

  // Verifica se tutti i prodotti hanno dimensioni e peso completi
  const allProductsHaveDimensions = products.every((product) => {
    // Verifica che il prodotto abbia tutte le dimensioni (height, width, depth) e peso
    const hasAllDimensions = 
      product.height !== null && product.height !== undefined && product.height > 0 &&
      product.width !== null && product.width !== undefined && product.width > 0 &&
      product.depth !== null && product.depth !== undefined && product.depth > 0
    const hasWeight = 
      product.weight !== null && product.weight !== undefined && product.weight > 0
    
    return hasAllDimensions && hasWeight
  })

  let baseCost = 0
  let carrier = 'Poste Italiane'
  let format: string | undefined = 'non_standard'
  let packages: Package[] = []
  let totalPackages = 1
  let useFixedPrice = false

  // Se manca anche solo una dimensione o peso per un prodotto, usa il prezzo fisso
  if (!allProductsHaveDimensions && fixedShippingPrice !== null && fixedShippingPrice > 0) {
    baseCost = fixedShippingPrice
    useFixedPrice = true
    carrier = 'Prezzo Fisso'
    format = undefined
    packages = [{
      packageNumber: 1,
      items: products.map((p) => ({
        productId: p.id,
        productName: p.name || 'Prodotto',
        quantity: p.quantity,
      })),
      totalWeight: 0,
      dimensions: { totalWeight: 0, maxSide: 0, sumOfSides: 0, maxHeight: 0, maxWidth: 0, maxDepth: 0 },
      cost: fixedShippingPrice,
      carrier: 'Prezzo Fisso',
      format: undefined,
    }]
  } else {
    // Usa la nuova logica per distribuire prodotti in pacchi
    const packageCalculation = calculateShippingWithPackages(products)
    baseCost = packageCalculation.totalCost
    carrier = packageCalculation.carrier
    packages = packageCalculation.packages
    totalPackages = packageCalculation.packages.length
    const mainPackage = packageCalculation.packages[0]
    format = mainPackage?.format
  }

  // Verifica se l'ordine raggiunge la soglia per spedizione gratuita
  let isFreeShipping = false
  if (freeShippingThreshold && freeShippingThreshold > 0 && subtotal !== undefined && subtotal >= freeShippingThreshold) {
    isFreeShipping = true
    baseCost = 0 // Spedizione gratuita
  }

  // Calcola costo finale con ricarico (se non è spedizione gratuita e non usa prezzo fisso)
  let finalCost: number
  if (isFreeShipping) {
    finalCost = 0
  } else if (useFixedPrice) {
    // Se usa prezzo fisso, non applicare markup
    finalCost = baseCost
  } else {
    // Calcola costo finale con ricarico
    finalCost = baseCost * (1 + markupPercent / 100)
  }

  return {
    carrier,
    baseCost,
    finalCost: Math.round(finalCost * 100) / 100, // Arrotonda a 2 decimali
    markupPercent: useFixedPrice ? 0 : markupPercent,
    format,
    packages,
    totalPackages,
    isFreeShipping,
    freeShippingThreshold,
  }
}

