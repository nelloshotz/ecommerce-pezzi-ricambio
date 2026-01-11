import shippingConfig from './shipping-config.json'

interface ProductDimensions {
  id: string
  height?: number | null
  width?: number | null
  depth?: number | null
  weight?: number | null
  quantity: number
  name?: string
}

export interface Package {
  packageNumber: number
  items: Array<{
    productId: string
    productName?: string
    quantity: number
  }>
  totalWeight: number
  dimensions: {
    height: number
    width: number
    depth: number
    maxSide: number
    sumOfSides: number
    volume: number // cm³
  }
  cost: number
  carrier: string
  format?: string // 'standard' o 'non_standard' per Poste Italiane
}

interface PackageCalculation {
  packages: Package[]
  totalCost: number
  totalWeight: number
  carrier: string
}

/**
 * Calcola il volume di un prodotto (cm³)
 */
function calculateProductVolume(product: ProductDimensions): number {
  const height = product.height || 1 // Minimo 1cm per evitare divisione per zero
  const width = product.width || 1
  const depth = product.depth || 1
  return height * width * depth
}

/**
 * Calcola le dimensioni di un pacco contenente più prodotti
 * Strategia: prendiamo il prodotto più grande per ogni dimensione
 */
function calculatePackageDimensions(items: ProductDimensions[]): {
  height: number
  width: number
  depth: number
  maxSide: number
  sumOfSides: number
  volume: number
} {
  let maxHeight = 0
  let maxWidth = 0
  let maxDepth = 0

  for (const item of items) {
    maxHeight = Math.max(maxHeight, item.height || 0)
    maxWidth = Math.max(maxWidth, item.width || 0)
    maxDepth = Math.max(maxDepth, item.depth || 0)
  }

  const height = Math.max(maxHeight, 1)
  const width = Math.max(maxWidth, 1)
  const depth = Math.max(maxDepth, 1)
  const maxSide = Math.max(height, width, depth)
  const sumOfSides = height + width + depth
  const volume = height * width * depth

  return {
    height,
    width,
    depth,
    maxSide,
    sumOfSides,
    volume,
  }
}

/**
 * Verifica se un pacco rientra nelle dimensioni di un corriere
 */
function fitsInCarrier(
  packageDims: ReturnType<typeof calculatePackageDimensions>,
  carrier: 'gls' | 'brt' | 'poste_standard' | 'poste_non_standard',
  weight: number
): boolean {
  switch (carrier) {
    case 'gls':
      return (
        packageDims.maxSide <= shippingConfig.gls.italia.dimensioni.lato_max_cm &&
        packageDims.sumOfSides <= shippingConfig.gls.italia.dimensioni.somma_lati_cm &&
        weight <= shippingConfig.gls.italia.peso_max_kg
      )
    case 'brt':
      return (
        packageDims.maxSide <= shippingConfig.brt.italia.dimensioni.lato_max_cm &&
        packageDims.sumOfSides <= shippingConfig.brt.italia.dimensioni.somma_lati_cm &&
        weight <= shippingConfig.brt.italia.peso_max_kg
      )
    case 'poste_standard':
      return (
        packageDims.maxSide <= shippingConfig.poste_italiane.italia.formati.standard.dimensioni.lato_max_cm &&
        packageDims.sumOfSides <= shippingConfig.poste_italiane.italia.formati.standard.dimensioni.somma_lati_cm &&
        weight <= shippingConfig.poste_italiane.italia.peso_max_kg
      )
    case 'poste_non_standard':
      return (
        packageDims.maxSide <= shippingConfig.poste_italiane.italia.formati.non_standard.dimensioni.lato_max_cm &&
        packageDims.sumOfSides <= shippingConfig.poste_italiane.italia.formati.non_standard.dimensioni.somma_lati_cm &&
        weight <= shippingConfig.poste_italiane.italia.peso_max_kg
      )
    default:
      return false
  }
}

/**
 * Calcola il prezzo per un pacco in base a peso e corriere
 */
function calculatePackagePrice(
  weight: number,
  carrier: 'gls' | 'brt' | 'poste_standard' | 'poste_non_standard'
): number | null {
  switch (carrier) {
    case 'gls':
      if (weight > shippingConfig.gls.italia.peso_max_kg) return null
      for (const tier of shippingConfig.gls.italia.prezzi_eur) {
        if (weight <= tier.max_kg) return tier.prezzo
      }
      return null
    case 'brt':
      if (weight > shippingConfig.brt.italia.peso_max_kg) return null
      for (const tier of shippingConfig.brt.italia.prezzi_eur) {
        if (weight <= tier.max_kg) return tier.prezzo
      }
      return null
    case 'poste_standard':
      if (weight > shippingConfig.poste_italiane.italia.peso_max_kg) return null
      for (const tier of shippingConfig.poste_italiane.italia.formati.standard.prezzi_eur) {
        if (weight <= tier.max_kg) return tier.prezzo
      }
      return null
    case 'poste_non_standard':
      if (weight > shippingConfig.poste_italiane.italia.peso_max_kg) return null
      for (const tier of shippingConfig.poste_italiane.italia.formati.non_standard.prezzi_eur) {
        if (weight <= tier.max_kg) return tier.prezzo
      }
      return null
    default:
      return null
  }
}

/**
 * Determina il corriere migliore per un pacco
 */
function determineCarrierForPackage(
  packageDims: ReturnType<typeof calculatePackageDimensions>,
  weight: number
): { carrier: string; format?: string; carrierKey: 'gls' | 'brt' | 'poste_standard' | 'poste_non_standard' } | null {
  // Logica: peso ≤ 10 kg → GLS, peso > 10 kg → BRT, altrimenti Poste
  if (weight <= 10) {
    if (fitsInCarrier(packageDims, 'gls', weight)) {
      return { carrier: 'GLS', carrierKey: 'gls' }
    }
  }

  if (weight > 10) {
    if (fitsInCarrier(packageDims, 'brt', weight)) {
      return { carrier: 'BRT', carrierKey: 'brt' }
    }
  }

  // Prova Poste Italiane
  if (fitsInCarrier(packageDims, 'poste_standard', weight)) {
    return { carrier: 'Poste Italiane', format: 'standard', carrierKey: 'poste_standard' }
  }

  if (fitsInCarrier(packageDims, 'poste_non_standard', weight)) {
    return { carrier: 'Poste Italiane', format: 'non_standard', carrierKey: 'poste_non_standard' }
  }

  // Fallback: usa Poste non standard anche se non rispetta dimensioni
  return { carrier: 'Poste Italiane', format: 'non_standard', carrierKey: 'poste_non_standard' }
}

/**
 * Distribuisce i prodotti in pacchi ottimizzando il volume
 * Algoritmo: First Fit Decreasing (FFD) per volume
 */
export function distributeProductsIntoPackages(
  products: ProductDimensions[]
): Package[] {
  const packages: Package[] = []
  
  // Ordina prodotti per volume decrescente (prodotti più grandi prima)
  const sortedProducts = [...products].sort((a, b) => {
    const volumeA = calculateProductVolume(a)
    const volumeB = calculateProductVolume(b)
    return volumeB - volumeA
  })

  // Per ogni prodotto, prova a inserirlo in un pacco esistente o creane uno nuovo
  for (const product of sortedProducts) {
    const productVolume = calculateProductVolume(product)
    const productWeight = (product.weight || 0) * product.quantity

    // Se il prodotto è molto grande, potrebbe richiedere un pacco dedicato
    // Dividiamo il prodotto in quantità se necessario
    let remainingQuantity = product.quantity

    while (remainingQuantity > 0) {
      let placed = false

      // Prova a inserire in un pacco esistente
      for (const pkg of packages) {
        // Calcola dimensioni del pacco se aggiungiamo questo prodotto
        const testItems = [
          ...pkg.items.map(item => {
            const prod = products.find(p => p.id === item.productId)
            return prod || { ...product, quantity: item.quantity }
          }),
          { ...product, quantity: 1 }, // Prova con 1 unità
        ]

        const testDims = calculatePackageDimensions(testItems)
        const testWeight = pkg.totalWeight + (product.weight || 0)

        // Determina corriere per il pacco test
        const testCarrier = determineCarrierForPackage(testDims, testWeight)

        if (testCarrier) {
          // Verifica se il pacco test rientra nelle dimensioni
          if (fitsInCarrier(testDims, testCarrier.carrierKey, testWeight)) {
            // Aggiungi prodotto al pacco esistente
            const existingItem = pkg.items.find(item => item.productId === product.id)
            if (existingItem) {
              existingItem.quantity += 1
            } else {
              pkg.items.push({
                productId: product.id,
                productName: product.name,
                quantity: 1,
              })
            }

            // Ricalcola dimensioni e peso del pacco
            const updatedItems = pkg.items.map(item => {
              const prod = products.find(p => p.id === item.productId)
              return prod || { ...product, quantity: item.quantity }
            })
            pkg.dimensions = calculatePackageDimensions(updatedItems)
            pkg.totalWeight += product.weight || 0

            // Ricalcola costo
            const newCarrier = determineCarrierForPackage(pkg.dimensions, pkg.totalWeight)
            if (newCarrier) {
              pkg.carrier = newCarrier.carrier
              pkg.format = newCarrier.format
              const newCost = calculatePackagePrice(pkg.totalWeight, newCarrier.carrierKey)
              if (newCost !== null) {
                pkg.cost = newCost
              }
            }

            remainingQuantity--
            placed = true
            break
          }
        }
      }

      // Se non è stato inserito, crea un nuovo pacco
      if (!placed) {
        const quantityToPlace = Math.min(remainingQuantity, product.quantity)
        const newPackageItems = [{ ...product, quantity: quantityToPlace }]
        const newPackageDims = calculatePackageDimensions(newPackageItems)
        const newPackageWeight = (product.weight || 0) * quantityToPlace

        const newCarrier = determineCarrierForPackage(newPackageDims, newPackageWeight)
        if (!newCarrier) {
          // Fallback: usa Poste non standard
          const fallbackCarrier = { carrier: 'Poste Italiane', format: 'non_standard', carrierKey: 'poste_non_standard' as const }
          const fallbackCost = calculatePackagePrice(newPackageWeight, fallbackCarrier.carrierKey) || 25.0

          packages.push({
            packageNumber: packages.length + 1,
            items: [
              {
                productId: product.id,
                productName: product.name,
                quantity: quantityToPlace,
              },
            ],
            totalWeight: newPackageWeight,
            dimensions: newPackageDims,
            cost: fallbackCost,
            carrier: fallbackCarrier.carrier,
            format: fallbackCarrier.format,
          })
        } else {
          const packageCost = calculatePackagePrice(newPackageWeight, newCarrier.carrierKey) || 25.0

          packages.push({
            packageNumber: packages.length + 1,
            items: [
              {
                productId: product.id,
                productName: product.name,
                quantity: quantityToPlace,
              },
            ],
            totalWeight: newPackageWeight,
            dimensions: newPackageDims,
            cost: packageCost,
            carrier: newCarrier.carrier,
            format: newCarrier.format,
          })
        }

        remainingQuantity -= quantityToPlace
      }
    }
  }

  return packages
}

/**
 * Calcola spedizione con gestione multipli colli
 */
export function calculateShippingWithPackages(
  products: ProductDimensions[]
): PackageCalculation {
  // Distribuisci prodotti in pacchi
  const packages = distributeProductsIntoPackages(products)

  // Calcola costo totale
  const totalCost = packages.reduce((sum, pkg) => sum + pkg.cost, 0)
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.totalWeight, 0)

  // Determina corriere principale (il più usato, o il primo se tutti diversi)
  const carrierCounts: Record<string, number> = {}
  for (const pkg of packages) {
    carrierCounts[pkg.carrier] = (carrierCounts[pkg.carrier] || 0) + 1
  }
  const mainCarrier = Object.entries(carrierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || packages[0]?.carrier || 'Poste Italiane'

  return {
    packages,
    totalCost,
    totalWeight,
    carrier: mainCarrier,
  }
}

