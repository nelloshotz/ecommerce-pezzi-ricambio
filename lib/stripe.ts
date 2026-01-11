// Utility per gestire Stripe

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

/**
 * Ottiene la configurazione Stripe attiva dal database
 */
export async function getStripeConfig() {
  try {
    const config = await prisma.stripeConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })

    if (!config || !config.secretKey) {
      return null
    }

    return {
      publishableKey: config.publishableKey || '',
      secretKey: config.secretKey,
      webhookSecret: config.webhookSecret || '',
      isTestMode: config.isTestMode,
      isActive: config.isActive,
    }
  } catch (error) {
    console.error('Errore nel recupero configurazione Stripe:', error)
    return null
  }
}

/**
 * Ottiene istanza Stripe configurata
 */
export async function getStripeInstance(): Promise<Stripe | null> {
  const config = await getStripeConfig()
  
  if (!config || !config.secretKey) {
    console.warn('Stripe non configurato: secret key mancante')
    return null
  }

  try {
    return new Stripe(config.secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  } catch (error) {
    console.error('Errore nella creazione istanza Stripe:', error)
    return null
  }
}

/**
 * Cripta una stringa (implementazione base - in produzione usare una libreria di criptazione)
 * Per semplicità, in questo progetto salviamo le chiavi come sono (non consigliato in produzione)
 * In produzione usare librerie come crypto-js o @noble/cipher
 */
export function encryptSecret(secret: string): string {
  // TODO: Implementare criptazione reale in produzione
  // Per ora ritorna il secret così com'è
  return secret
}

/**
 * Decripta una stringa
 */
export function decryptSecret(encrypted: string): string {
  // TODO: Implementare decriptazione reale in produzione
  // Per ora ritorna il secret così com'è
  return encrypted
}

