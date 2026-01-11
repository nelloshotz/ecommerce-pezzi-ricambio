import shippingConfigDefault from './shipping-config.json'
import { prisma } from './prisma'

export interface ShippingConfig {
  poste_italiane: {
    italia: {
      peso_max_kg: number
      formati: {
        standard: {
          dimensioni: {
            lato_max_cm: number
            somma_lati_cm: number
          }
          prezzi_eur: Array<{ max_kg: number; prezzo: number }>
        }
        non_standard: {
          dimensioni: {
            lato_max_cm: number
            somma_lati_cm: number
          }
          prezzi_eur: Array<{ max_kg: number; prezzo: number }>
        }
      }
    }
  }
  brt: {
    italia: {
      peso_max_kg: number
      dimensioni: {
        lato_max_cm: number
        somma_lati_cm: number
      }
      prezzi_eur: Array<{ max_kg: number; prezzo: number }>
    }
  }
  gls: {
    italia: {
      peso_max_kg: number
      dimensioni: {
        lato_max_cm: number
        somma_lati_cm: number
      }
      prezzi_eur: Array<{ max_kg: number; prezzo: number }>
    }
  }
}

let cachedConfig: ShippingConfig | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minuto

/**
 * Recupera la configurazione corrieri dal database o usa quella di default
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  // Usa cache se disponibile e non scaduta
  const now = Date.now()
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedConfig
  }

  try {
    const config = await prisma.carrierConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (config) {
      const parsed = JSON.parse(config.config) as ShippingConfig
      cachedConfig = parsed
      cacheTimestamp = now
      return parsed
    }
  } catch (error) {
    console.error('Errore nel recupero configurazione corrieri dal database:', error)
  }

  // Fallback alla configurazione di default
  cachedConfig = shippingConfigDefault as ShippingConfig
  cacheTimestamp = now
  return shippingConfigDefault as ShippingConfig
}

/**
 * Invalida la cache (da chiamare dopo aggiornamenti)
 */
export function invalidateShippingConfigCache() {
  cachedConfig = null
  cacheTimestamp = 0
}

