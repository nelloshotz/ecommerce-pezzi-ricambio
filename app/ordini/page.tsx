'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { FiShoppingBag, FiPackage, FiTruck, FiCheckCircle, FiClock, FiX } from 'react-icons/fi'
import { getOrderStatusConfig } from '@/lib/orderStatus'

interface OrderItem {
  id: string
  quantity: number
  price: number
  total: number
  productName: string
  productSku?: string | null
  product: {
    id: string
    name: string
    image: string
    slug: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  subtotal: number
  shippingCost: number
  paymentStatus: string
  trackingNumber?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
  items: OrderItem[]
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  PENDING: {
    label: 'In Attesa Pagamento',
    icon: FiClock,
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
  },
  CONFIRMED: {
    label: 'Ordine Confermato',
    icon: FiPackage,
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
  },
  SHIPPED: {
    label: 'Spedito',
    icon: FiTruck,
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
  },
  DELIVERED: {
    label: 'Arrivato',
    icon: FiCheckCircle,
    color: 'text-green-800',
    bgColor: 'bg-green-100',
  },
  DELAYED: {
    label: 'In Ritardo',
    icon: FiClock,
    color: 'text-red-800',
    bgColor: 'bg-red-100',
  },
  CANCELLED: {
    label: 'Annullato',
    icon: FiX,
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
  },
  REFUNDED: {
    label: 'Rimborsato',
    icon: FiX,
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
  },
}

export default function OrdiniPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    loadOrders()
  }, [user])

  const loadOrders = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/users/${user.id}/orders`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Errore nel caricamento ordini:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Caricamento ordini...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">I Miei Ordini</h1>
        <p className="text-gray-600">Visualizza lo stato e i dettagli dei tuoi ordini</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nessun ordine ancora</h2>
          <p className="text-gray-600 mb-6">Non hai ancora effettuato alcun ordine.</p>
          <Link
            href="/catalogo"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
          >
            Sfoglia il Catalogo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            // Usa getOrderStatusConfig per configurazione corretta
            const statusInfo = getOrderStatusConfig(order.status as any)
            const status = statusConfig[order.status] || {
              label: statusInfo.label,
              icon: FiPackage,
              color: statusInfo.color,
              bgColor: statusInfo.bgColor,
            }
            const StatusIcon = status.icon

            return (
              <Link
                key={order.id}
                href={`/ordini/${order.id}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          Ordine #{order.orderNumber}
                        </h3>
                        <span
                          className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          <span>{status.label}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Data: {new Date(order.createdAt).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {order.trackingNumber && (
                        <p className="text-sm text-primary-600 mt-1">
                          📦 Tracking: {order.trackingNumber}
                        </p>
                      )}
                      {order.status === 'DELAYED' && order.shippedAt && (
                        <p className="text-sm text-red-600 mt-1 font-medium">
                          ⚠️ In ritardo da {Math.floor((new Date().getTime() - new Date(order.shippedAt).getTime()) / (1000 * 60 * 60 * 24))} giorni
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">
                        €{order.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} articoli
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-600">
                          {order.items.length} prodotto{order.items.length !== 1 ? 'i' : ''}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        Pagamento:{' '}
                        <span
                          className={`font-medium ${
                            order.paymentStatus === 'PAID'
                              ? 'text-green-600'
                              : order.paymentStatus === 'FAILED'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {order.paymentStatus === 'PAID'
                            ? 'Pagato'
                            : order.paymentStatus === 'FAILED'
                            ? 'Fallito'
                            : order.paymentStatus === 'REFUNDED'
                            ? 'Rimborsato'
                            : 'In Attesa'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

