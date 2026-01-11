import { Order } from '@/types'

// GET - Recupera tutti gli ordini (per admin) con paginazione
export async function getAllOrders(page: number = 1, limit: number = 20): Promise<{
  orders: Order[]
  pagination: {
    page: number
    limit: number
    totalOrders: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}> {
  try {
    const response = await fetch(`/api/admin/orders?page=${page}&limit=${limit}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Errore nel recupero ordini')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Errore nel recupero ordini:', error)
    return {
      orders: [],
      pagination: {
        page: 1,
        limit: 20,
        totalOrders: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }
  }
}

// GET - Recupera ordine per ID (per admin)
export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const response = await fetch(`/api/admin/orders/${id}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Errore nel recupero ordine')
    }
    const data = await response.json()
    // Assicuriamoci che i dati siano formattati correttamente
    return data
  } catch (error) {
    console.error('Errore nel recupero ordine:', error)
    return null
  }
}

// GET - Recupera ordini per utente
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  try {
    const response = await fetch(`/api/users/${userId}/orders`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Errore nel recupero ordini')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Errore nel recupero ordini:', error)
    return []
  }
}

// PUT - Aggiorna ordine (stato, tracking, note, etc.)
export async function updateOrder(
  orderId: string,
  updates: {
    status?: Order['status']
    trackingNumber?: string | null
    notes?: string | null
    paymentStatus?: Order['paymentStatus']
    markAsDelivered?: boolean
    shippingCarrier?: string | null
  }
): Promise<Order | null> {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    if (!response.ok) {
      throw new Error('Errore nell\'aggiornamento ordine')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Errore nell\'aggiornamento ordine:', error)
    return null
  }
}

// Funzione di compatibilità (mantiene vecchio nome)
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order | null> {
  return updateOrder(orderId, { status })
}

