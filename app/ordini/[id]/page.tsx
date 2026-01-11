'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import Image from 'next/image'
import {
  FiArrowLeft,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiX,
  FiDownload,
  FiMapPin,
  FiMail,
  FiPhone,
  FiShoppingBag,
  FiMessageCircle,
  FiStar,
} from 'react-icons/fi'
import ReviewForm from '@/components/ordini/ReviewForm'
import OrderMessages from '@/components/ordini/OrderMessages'

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
    brand?: string | null
    partNumber?: string | null
    category?: {
      name: string
    } | null
  }
}

interface Address {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  province?: string | null
  country: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  subtotal: number
  shippingCost: number
  shippingCarrier?: string | null
  shippingBaseCost?: number | null
  shippingMarkupPercent?: number | null
  shippingPackages?: string | null
  tax: number
  paymentStatus: string
  paymentMethod?: string | null
  trackingNumber?: string | null
  notes?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  shippingAddress: Address
  billingAddress: Address
}

import { getOrderStatusConfig } from '@/lib/orderStatus'

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

export default function OrdineDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const { user, isAuthenticated } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    loadOrder()
  }, [orderId, user])

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        // Verifica che l'ordine appartenga all'utente corrente
        if (data.order && data.order.user?.id === user?.id) {
          setOrder(data.order)
        } else {
          router.push('/ordini')
        }
      } else {
        router.push('/ordini')
      }
    } catch (error) {
      console.error('Errore nel caricamento ordine:', error)
      router.push('/ordini')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTracking = () => {
    if (!order || !order.trackingNumber) return

    // Genera lettera di vettura/bollettino di spedizione
    const trackingInfo = {
      numeroOrdine: order.orderNumber,
      numeroTracking: order.trackingNumber,
      dataSpedizione: order.shippedAt
        ? new Date(order.shippedAt).toLocaleDateString('it-IT')
        : 'In preparazione',
      destinatario: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      indirizzo: order.shippingAddress.address,
      citta: `${order.shippingAddress.postalCode} ${order.shippingAddress.city}`,
      stato: order.status,
    }

    // Crea e scarica file JSON (in produzione potrebbe essere PDF)
    const blob = new Blob([JSON.stringify(trackingInfo, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tracking-${order.orderNumber}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Caricamento ordine...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 mb-4">Ordine non trovato</p>
        <Link href="/ordini" className="text-primary-600 hover:text-primary-700">
          Torna ai Miei Ordini
        </Link>
      </div>
    )
  }

  // Usa getOrderStatusConfig per ottenere configurazione corretta
  const statusInfo = getOrderStatusConfig(order.status as any)
  const status = statusConfig[order.status] || {
    label: statusInfo.label,
    icon: FiPackage,
    color: statusInfo.color,
    bgColor: statusInfo.bgColor,
  }
  const StatusIcon = status.icon

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-4 mb-8">
        <Link
          href="/ordini"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Ordine #{order.orderNumber}</h1>
          <p className="text-gray-600 mt-1">
            Data: {new Date(order.createdAt).toLocaleDateString('it-IT', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenuto Principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stato Ordine e Tracking */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiShoppingBag className="mr-2" />
              Stato Ordine
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${status.bgColor} ${status.color}`}
                  >
                    <StatusIcon className="w-5 h-5" />
                    <span>{status.label}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : order.paymentStatus === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : order.paymentStatus === 'REFUNDED'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.paymentStatus === 'PAID'
                      ? 'Pagato'
                      : order.paymentStatus === 'FAILED'
                      ? 'Fallito'
                      : order.paymentStatus === 'REFUNDED'
                      ? 'Rimborsato'
                      : 'Pagamento in Attesa'}
                  </span>
                </div>
              </div>

              {order.trackingNumber && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Numero Tracking</p>
                      <p className="text-lg font-mono font-semibold text-primary-600">
                        {order.trackingNumber}
                      </p>
                      {order.shippedAt && (
                        <p className="text-sm text-gray-600 mt-1">
                          Spedito il:{' '}
                          {new Date(order.shippedAt).toLocaleDateString('it-IT')}
                        </p>
                      )}
                      {order.deliveredAt && (
                        <p className="text-sm text-green-600 mt-1 font-medium">
                          ✓ Consegnato il:{' '}
                          {new Date(order.deliveredAt).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleDownloadTracking}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Scarica Lettera di Vettura</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prodotti Ordinati */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiPackage className="mr-2" />
              Prodotti Ordinati
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-4 border-b pb-4 last:border-0"
                >
                  <Link href={`/prodotto/${item.product.id}`}>
                    <div className="relative w-20 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition">
                      <Image
                        src={item.product.image || '/images/placeholder.svg'}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </Link>
                  <div className="flex-1">
                    <Link
                      href={`/prodotto/${item.product.id}`}
                      className="font-semibold hover:text-primary-600 transition"
                    >
                      {item.productName}
                    </Link>
                    {item.product.brand && (
                      <p className="text-sm text-gray-600">Marca: {item.product.brand}</p>
                    )}
                    {item.productSku && (
                      <p className="text-sm text-gray-600">SKU: {item.productSku}</p>
                    )}
                    {item.product.category && (
                      <p className="text-sm text-gray-600">
                        Categoria: {item.product.category.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Quantità: {item.quantity}</p>
                    <p className="font-medium">€{item.price.toFixed(2)}</p>
                    <p className="font-semibold text-primary-600">
                      €{item.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotale:</span>
                <span className="font-medium">€{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-600">Spedizione:</span>
                    {order.shippingCarrier && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        <FiPackage className="w-3 h-3 mr-1" />
                        {order.shippingCarrier}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">€{order.shippingCost.toFixed(2)}</span>
                </div>
                {order.shippingBaseCost && order.shippingMarkupPercent && order.shippingMarkupPercent > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Base: €{order.shippingBaseCost.toFixed(2)} + {order.shippingMarkupPercent}% ricarico
                  </p>
                )}
                {/* Mostra info colli se presenti */}
                {order.shippingPackages && (() => {
                  try {
                    const packages = JSON.parse(order.shippingPackages)
                    if (packages && packages.length > 1) {
                      return (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            {packages.length} Colli:
                          </p>
                          {packages.map((pkg: any) => (
                            <p key={pkg.packageNumber} className="text-xs text-gray-600 ml-2">
                              Collo {pkg.packageNumber}: {pkg.items.map((item: any) => `${item.productName || 'Prodotto'} (x${item.quantity})`).join(', ')}
                            </p>
                          ))}
                        </div>
                      )
                    }
                  } catch (e) {
                    return null
                  }
                  return null
                })()}
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">IVA:</span>
                  <span className="font-medium">€{order.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-bold pt-2 border-t">
                <span>Totale:</span>
                <span className="text-primary-600">€{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Indirizzo di Spedizione */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiMapPin className="mr-2" />
              Indirizzo di Spedizione
            </h2>
            <div className="space-y-2 text-gray-700">
              <p className="font-medium">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.address}</p>
              <p>
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
                {order.shippingAddress.province && ` (${order.shippingAddress.province})`}
              </p>
              <p>{order.shippingAddress.country}</p>
              <div className="pt-2 text-sm">
                <p className="flex items-center space-x-2">
                  <FiMail className="w-4 h-4" />
                  <span>{order.shippingAddress.email}</span>
                </p>
                <p className="flex items-center space-x-2 mt-1">
                  <FiPhone className="w-4 h-4" />
                  <span>{order.shippingAddress.phone}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Note Ordine */}
          {order.notes && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Note Ordine</h2>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}

          {/* Recensione */}
          <ReviewForm orderId={order.id} orderStatus={order.status} />

          {/* Messaggistica Ordine */}
          <OrderMessages orderId={order.id} orderStatus={order.status} />
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Informazioni Ordine</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Numero Ordine:</span>
                <p className="font-medium font-mono">{order.orderNumber}</p>
              </div>
              <div>
                <span className="text-gray-600">Metodo Pagamento:</span>
                <p className="font-medium">{order.paymentMethod || 'Non specificato'}</p>
              </div>
              <div>
                <span className="text-gray-600">Data Creazione:</span>
                <p className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString('it-IT')}
                </p>
                <p className="text-gray-500 text-xs">
                  {new Date(order.createdAt).toLocaleTimeString('it-IT')}
                </p>
              </div>
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <div>
                  <span className="text-gray-600">Ultimo Aggiornamento:</span>
                  <p className="font-medium">
                    {new Date(order.updatedAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
              {order.shippedAt && (
                <div>
                  <span className="text-gray-600">Data Spedizione:</span>
                  <p className="font-medium text-purple-600">
                    {new Date(order.shippedAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <span className="text-gray-600">Data Consegna:</span>
                  <p className="font-medium text-green-600">
                    {new Date(order.deliveredAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

