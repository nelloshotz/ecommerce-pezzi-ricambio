// Funzioni per gestire stati ordini e logica "In Ritardo"

import { Order } from '@prisma/client'

/**
 * Calcola lo stato automatico dell'ordine in base alle date
 * Se ordine è SHIPPED da più di 3 giorni e non è DELIVERED, diventa DELAYED
 */
export function calculateOrderStatus(order: Order): string {
  // Se già arrivato o annullato/rimborsato, mantieni stato
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return order.status
  }

  // Se è stato spedito, verifica se è in ritardo
  if (order.status === 'SHIPPED' && order.shippedAt) {
    const shippedDate = new Date(order.shippedAt)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24))

    // Se sono passati più di 3 giorni dalla spedizione e non è ancora arrivato
    if (daysDiff > 3 && !order.deliveredAt) {
      return 'DELAYED'
    }
  }

  // Se stato era DELAYED ma ora è arrivato, torna a DELIVERED (non dovrebbe succedere ma per sicurezza)
  if (order.status === 'DELAYED' && order.deliveredAt) {
    return 'DELIVERED'
  }

  return order.status
}

/**
 * Aggiorna stato ordine quando viene inserito tracking
 */
export function getStatusAfterTrackingInsert(): string {
  return 'SHIPPED'
}

/**
 * Aggiorna stato ordine quando viene confermato pagamento
 */
export function getStatusAfterPayment(): string {
  return 'CONFIRMED'
}

/**
 * Aggiorna stato ordine quando viene confermata consegna
 */
export function getStatusAfterDelivery(): string {
  return 'DELIVERED'
}

/**
 * Ottiene la configurazione visiva per ogni stato
 */
export function getOrderStatusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bgColor: string; description: string; icon?: any }> = {
    PENDING: {
      label: 'In Attesa Pagamento',
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      description: 'In attesa di pagamento',
      icon: null,
    },
    CONFIRMED: {
      label: 'Ordine Confermato',
      color: 'text-blue-800',
      bgColor: 'bg-blue-100',
      description: 'Ordine confermato appena pagato',
      icon: null,
    },
    SHIPPED: {
      label: 'Spedito',
      color: 'text-purple-800',
      bgColor: 'bg-purple-100',
      description: 'Ordine spedito con tracking',
      icon: null,
    },
    DELIVERED: {
      label: 'Arrivato',
      color: 'text-green-800',
      bgColor: 'bg-green-100',
      description: 'Ordine consegnato',
      icon: null,
    },
    DELAYED: {
      label: 'In Ritardo',
      color: 'text-red-800',
      bgColor: 'bg-red-100',
      description: 'In ritardo (più di 3 giorni dalla spedizione)',
      icon: null,
    },
    CANCELLED: {
      label: 'Annullato',
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      description: 'Ordine annullato',
      icon: null,
    },
    REFUNDED: {
      label: 'Rimborsato',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      description: 'Ordine rimborsato',
      icon: null,
    },
  }

  return configs[status] || configs.PENDING
}

