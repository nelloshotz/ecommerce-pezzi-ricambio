'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { getOrderById, updateOrder } from '@/lib/orders'
import { Order } from '@/types'
import { getOrderStatusConfig } from '@/lib/orderStatus'
import { FiArrowLeft, FiSave, FiEdit, FiCheckCircle, FiClock, FiTruck, FiPackage, FiX, FiMapPin, FiCalendar, FiMessageCircle, FiDownload } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'
import OrderMessages from '@/components/ordini/OrderMessages'

const statusOptions: Order['status'][] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'DELAYED', 'CANCELLED', 'REFUNDED']

const paymentStatusOptions: Order['paymentStatus'][] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED']

const paymentStatusLabels: Record<Order['paymentStatus'], string> = {
  PENDING: 'In Attesa',
  PAID: 'Pagato',
  FAILED: 'Fallito',
  REFUNDED: 'Rimborsato',
}

export default function AdminOrdineDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Order & { trackingNumber: string; shippingCarrier: string }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadOrder() {
      try {
        const orderData = await getOrderById(orderId)
        if (orderData) {
          setOrder(orderData)
          setFormData({
            status: orderData.status,
            paymentStatus: orderData.paymentStatus,
            notes: orderData.notes || '',
            trackingNumber: orderData.trackingNumber || '',
            shippingCarrier: orderData.shippingCarrier || '',
          })
        }
      } catch (error) {
        console.error('Errore nel caricamento ordine:', error)
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [orderId])

  const handleSave = async () => {
    if (!order) return

    setSaving(true)
    try {
      const updates: any = {
        status: formData.status || order.status,
        paymentStatus: formData.paymentStatus || order.paymentStatus,
        notes: formData.notes !== undefined ? formData.notes : order.notes,
      }

      // Se tracking è stato modificato, aggiornalo
      if (formData.trackingNumber !== undefined) {
        updates.trackingNumber = formData.trackingNumber || null
      }

      // Se corriere è stato modificato, aggiornalo
      if (formData.shippingCarrier !== undefined) {
        updates.shippingCarrier = formData.shippingCarrier || null
      }

      const updatedOrder = await updateOrder(order.id, updates)
      if (updatedOrder) {
        setOrder(updatedOrder)
        setEditing(false)
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      alert('Errore nel salvataggio dell\'ordine')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAsDelivered = async () => {
    if (!order) return

    if (!confirm('Confermi che l\'ordine è stato consegnato?')) {
      return
    }

    setSaving(true)
    try {
      const updatedOrder = await updateOrder(order.id, { markAsDelivered: true })
      if (updatedOrder) {
        setOrder(updatedOrder)
        setFormData({
          ...formData,
          status: updatedOrder.status,
        })
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento:', error)
      alert('Errore nell\'aggiornamento dell\'ordine')
    } finally {
      setSaving(false)
    }
  }

  const handleTrackingChange = (value: string) => {
    setFormData({
      ...formData,
      trackingNumber: value,
    })
    
    // Se viene inserito un tracking, suggerisci di cambiare stato a SHIPPED
    if (value && value.trim() !== '' && formData.status && formData.status !== 'SHIPPED' && formData.status !== 'DELIVERED') {
      if (confirm('Vuoi aggiornare lo stato a "Spedito" ora?')) {
        setFormData({
          ...formData,
          status: 'SHIPPED',
          trackingNumber: value,
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento ordine...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Ordine non trovato</p>
        <Link href="/admin/ordini" className="text-primary-600 hover:text-primary-700">
          Torna alla lista ordini
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/ordini"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Ordine {order.id}</h1>
            <p className="text-gray-600 mt-1">
              Creato il {new Date(order.createdAt).toLocaleString('it-IT')}
            </p>
          </div>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <FiEdit className="w-5 h-5" />
            <span>Modifica</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setEditing(false)
                setFormData({ 
                  status: order.status, 
                  paymentStatus: order.paymentStatus, 
                  notes: order.notes || '',
                  trackingNumber: order.trackingNumber || '',
                  shippingCarrier: order.shippingCarrier || ''
                })
              }}
              className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              <FiX className="w-5 h-5" />
              <span>Annulla</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              <span>{saving ? 'Salvataggio...' : 'Salva'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informazioni Principali */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prodotti */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Prodotti Ordinati</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 border-b pb-4 last:border-0">
                    <Link href={`/prodotto/${item.product?.id || item.productId}`}>
                    <div className="relative w-20 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition">
                      <Image
                        src={item.product?.image || '/images/placeholder.svg'}
                        alt={item.productName || item.product?.name || 'Prodotto'}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </Link>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.productName || item.product?.name || 'Prodotto'}</h3>
                    {item.product?.brand && <p className="text-sm text-gray-600">Marca: {item.product.brand}</p>}
                    {item.product?.partNumber && <p className="text-sm text-gray-600">Codice: {item.product.partNumber}</p>}
                    {item.productSku && <p className="text-sm text-gray-600">SKU: {item.productSku}</p>}
                    <p className="text-sm text-gray-600">
                      Categoria: {typeof item.product?.category === 'string' 
                        ? item.product.category 
                        : (item.product?.category as any)?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">€{((item as any).price ?? 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Quantità: {item.quantity ?? 0}</p>
                    <p className="text-sm font-medium text-primary-600">
                      Totale: €{((item as any).total ?? ((item as any).price ?? 0) * (item.quantity ?? 0)).toFixed(2)}
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
              </div>
              <div className="flex justify-between items-center text-xl font-bold pt-2 border-t">
                <span>Totale:</span>
                <span className="text-primary-600">€{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Indirizzo di Spedizione */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Indirizzo di Spedizione</h2>
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
              <p className="pt-2">📧 {order.shippingAddress.email}</p>
              <p>📞 {order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Indirizzo di Fatturazione */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Indirizzo di Fatturazione</h2>
            <div className="space-y-2 text-gray-700">
              <p className="font-medium">
                {order.billingAddress.firstName} {order.billingAddress.lastName}
              </p>
              <p>{order.billingAddress.address}</p>
              <p>
                {order.billingAddress.postalCode} {order.billingAddress.city}
                {order.billingAddress.province && ` (${order.billingAddress.province})`}
              </p>
              <p>{order.billingAddress.country}</p>
              <p className="pt-2">📧 {order.billingAddress.email}</p>
              <p>📞 {order.billingAddress.phone}</p>
            </div>
          </div>

          {/* Note */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Note</h2>
            {editing ? (
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={4}
                placeholder="Aggiungi note..."
              />
            ) : (
              <p className="text-gray-700">{order.notes || <span className="text-gray-400 italic">Nessuna nota</span>}</p>
            )}
          </div>

          {/* Messaggistica Ordine */}
          <OrderMessages orderId={order.id} orderStatus={order.status} />
        </div>

        {/* Sidebar Stato e Informazioni */}
        <div className="space-y-6">
          {/* Stato Ordine */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Stato Ordine</h2>
            {editing ? (
              <select
                value={formData.status || order.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Order['status'] })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4"
              >
                {statusOptions.map((status) => {
                  const config = getOrderStatusConfig(status)
                  return (
                    <option key={status} value={status}>
                      {config.label}
                    </option>
                  )
                })}
              </select>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const config = getOrderStatusConfig(order.status)
                  return (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                      {config.label}
                    </span>
                  )
                })()}
                <p className="text-xs text-gray-500 mt-1">{getOrderStatusConfig(order.status).description}</p>
              </div>
            )}
            
            {/* Tracking Number */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiTruck className="inline w-4 h-4 mr-1" />
                Codice Tracking
              </label>
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.trackingNumber || ''}
                    onChange={(e) => handleTrackingChange(e.target.value)}
                    placeholder="Inserisci codice tracking..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {formData.trackingNumber && (
                    <p className="text-xs text-blue-600">
                      Inserendo un tracking, lo stato verrà aggiornato a &quot;Spedito&quot;
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {order.trackingNumber ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-mono font-medium text-blue-900">{order.trackingNumber}</p>
                      {order.shippedAt && (
                        <p className="text-xs text-blue-600 mt-1">
                          Spedito il {new Date(order.shippedAt).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nessun tracking inserito</p>
                  )}
                </div>
              )}
            </div>

            {/* Nome Corriere */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiTruck className="inline w-4 h-4 mr-1" />
                Nome Corriere
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.shippingCarrier || ''}
                  onChange={(e) => setFormData({ ...formData, shippingCarrier: e.target.value })}
                  placeholder="Es. GLS, BRT, Poste Italiane..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              ) : (
                <div>
                  {order.shippingCarrier ? (
                    <p className="text-sm font-medium text-gray-900">{order.shippingCarrier}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nessun corriere impostato</p>
                  )}
                </div>
              )}
            </div>

            {/* Download Etichetta Spedizione */}
            <div className="mt-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/admin/orders/${orderId}/shipping-label`, {
                      headers: {
                        'x-user-id': user?.id || '',
                      },
                    })

                    if (!response.ok) {
                      let errorMessage = 'Errore nel download etichetta'
                      try {
                        const data = await response.json()
                        errorMessage = data.error || data.details || errorMessage
                      } catch (e) {
                        // Se la risposta non è JSON, usa il messaggio di default
                        errorMessage = `Errore ${response.status}: ${response.statusText}`
                      }
                      throw new Error(errorMessage)
                    }

                    // Verifica che la risposta sia un PDF
                    const contentType = response.headers.get('content-type')
                    if (!contentType || !contentType.includes('application/pdf')) {
                      throw new Error('La risposta non è un PDF valido')
                    }

                    const blob = await response.blob()
                    
                    // Verifica che il blob non sia vuoto
                    if (blob.size === 0) {
                      throw new Error('Il PDF generato è vuoto')
                    }

                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `etichetta-spedizione-${order?.orderNumber || orderId}.pdf`
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                  } catch (error: any) {
                    console.error('Errore nel download etichetta:', error)
                    alert(error.message || 'Errore nel download etichetta. Verifica che i dati azienda siano configurati correttamente.')
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <FiDownload className="w-4 h-4" />
                <span>Scarica Etichetta Spedizione</span>
              </button>
            </div>

            {/* Azione rapida: Marca come consegnato */}
            {!editing && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
              <button
                onClick={handleMarkAsDelivered}
                disabled={saving}
                className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span>Marca come Consegnato</span>
              </button>
            )}
          </div>

          {/* Stato Pagamento */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Stato Pagamento</h2>
            {editing ? (
              <select
                value={formData.paymentStatus || order.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as Order['paymentStatus'] })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4"
              >
                {paymentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {paymentStatusLabels[status]}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  order.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                  order.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {paymentStatusLabels[order.paymentStatus]}
                </span>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-2">Metodo: {order.paymentMethod}</p>
          </div>

          {/* Informazioni Aggiuntive */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Informazioni</h2>
            <div className="space-y-3 text-sm">
              {order.orderNumber && (
                <div>
                  <span className="text-gray-600">Numero Ordine:</span>
                  <p className="font-medium font-mono">{order.orderNumber}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">ID Utente:</span>
                <p className="font-medium">{order.userId}</p>
              </div>
              {order.user && (
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <p className="font-medium">{order.user.name}</p>
                  <p className="text-gray-500 text-xs">{order.user.email}</p>
                </div>
              )}
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <FiCalendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Creato:</span>
                    <p className="font-medium">{new Date(order.createdAt).toLocaleString('it-IT')}</p>
                  </div>
                </div>
                {order.confirmedAt && (
                  <div className="flex items-center space-x-2">
                    <FiCheckCircle className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="text-gray-600">Confermato:</span>
                      <p className="font-medium">{new Date(order.confirmedAt).toLocaleString('it-IT')}</p>
                    </div>
                  </div>
                )}
                {order.shippedAt && (
                  <div className="flex items-center space-x-2">
                    <FiTruck className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="text-gray-600">Spedito:</span>
                      <p className="font-medium">{new Date(order.shippedAt).toLocaleString('it-IT')}</p>
                    </div>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex items-center space-x-2">
                    <FiPackage className="w-4 h-4 text-green-400" />
                    <div>
                      <span className="text-gray-600">Consegnato:</span>
                      <p className="font-medium">{new Date(order.deliveredAt).toLocaleString('it-IT')}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Ultimo Aggiornamento:</span>
                    <p className="font-medium">{new Date(order.updatedAt).toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

