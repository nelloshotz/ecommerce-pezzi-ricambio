'use client'

import { useEffect, useState } from 'react'
import { getAllOrders } from '@/lib/orders'
import { Order } from '@/types'
import { FiSearch, FiEye, FiFilter, FiX, FiChevronLeft, FiChevronRight, FiPackage, FiTruck, FiCheckCircle, FiClock, FiUser, FiMessageCircle } from 'react-icons/fi'
import Link from 'next/link'
import { getOrderStatusConfig } from '@/lib/orderStatus'

const statusOptions: { value: Order['status'] | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'Tutti', color: 'bg-gray-500' },
  { value: 'PENDING', label: 'In Attesa Pagamento', color: 'bg-yellow-500' },
  { value: 'CONFIRMED', label: 'Ordine Confermato', color: 'bg-blue-500' },
  { value: 'SHIPPED', label: 'Spedito', color: 'bg-purple-500' },
  { value: 'DELIVERED', label: 'Arrivato', color: 'bg-green-500' },
  { value: 'DELAYED', label: 'In Ritardo', color: 'bg-red-500' },
  { value: 'CANCELLED', label: 'Annullato', color: 'bg-gray-500' },
  { value: 'REFUNDED', label: 'Rimborsato', color: 'bg-orange-500' },
]

const paymentStatusOptions: { value: Order['paymentStatus'] | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'Tutti', color: 'bg-gray-500' },
  { value: 'PENDING', label: 'In Attesa', color: 'bg-yellow-500' },
  { value: 'PAID', label: 'Pagato', color: 'bg-green-500' },
  { value: 'FAILED', label: 'Fallito', color: 'bg-red-500' },
  { value: 'REFUNDED', label: 'Rimborsato', color: 'bg-orange-500' },
]

export default function AdminOrdiniPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<Order['paymentStatus'] | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalOrders: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const loadOrders = async (page: number = 1) => {
    try {
      setLoading(true)
      const data = await getAllOrders(page, 20)
      setOrders(data.orders)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Errore nel caricamento ordini:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders(currentPage)
  }, [currentPage])

  // Filtra ordini lato client (dopo il caricamento dalla paginazione)
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchQuery === '' ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress.lastName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter

    return matchesSearch && matchesStatus && matchesPaymentStatus
  })

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPaymentStatusFilter('all')
  }

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (paymentStatusFilter !== 'all' ? 1 : 0)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento ordini...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Gestione Ordini</h1>
        <div className="text-sm text-gray-600">
          Totale ordini: {pagination.totalOrders} | Pagina {pagination.page} di {pagination.totalPages}
        </div>
      </div>

      {/* Filtri e Ricerca */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative md:col-span-2">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca ordine (numero, email, nome cliente)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stato Ordine
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Order['status'] | 'all')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stato Pagamento
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as Order['paymentStatus'] | 'all')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <FiX className="w-4 h-4" />
            <span>Pulisci filtri ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Tabella Ordini */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numero Ordine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Caricamento...' : 'Nessun ordine trovato'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusConfig = getOrderStatusConfig(order.status)
                  
                  // Determina se l'ordine è "inevaso" (non consegnato/annullato/rimborsato)
                  const isUnfulfilled = !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)
                  
                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 transition ${isUnfulfilled ? 'bg-yellow-50/30' : ''}`}
                    >
                      {/* Numero Ordine */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber || order.id.substring(0, 8)}
                        </div>
                        {order.trackingNumber && (
                          <div className="text-xs text-purple-600 font-mono mt-1 flex items-center space-x-1">
                            <FiTruck className="w-3 h-3" />
                            <span>{order.trackingNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* Cliente */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.user?.name || `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.user?.email || order.shippingAddress.email}
                        </div>
                      </td>

                      {/* Importo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          €{order.total.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.items.length} {order.items.length === 1 ? 'prodotto' : 'prodotti'}
                        </div>
                      </td>

                      {/* Stato */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                            title={statusConfig.description}
                          >
                            {statusConfig.label}
                          </span>
                          {order.unreadMessagesCount && order.unreadMessagesCount > 0 && (
                            <div 
                              className="relative inline-flex items-center justify-center"
                              title={`${order.unreadMessagesCount} messaggio${order.unreadMessagesCount > 1 ? ' non letti' : ' non letto'}`}
                            >
                              <FiMessageCircle className="w-5 h-5 text-primary-600" />
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                                {order.unreadMessagesCount > 9 ? '9+' : order.unreadMessagesCount}
                              </span>
                            </div>
                          )}
                        </div>
                        {order.status === 'DELAYED' && order.shippedAt && (
                          <div className="text-xs text-red-600 mt-1">
                            Ritardato da {Math.floor((new Date().getTime() - new Date(order.shippedAt).getTime()) / (1000 * 60 * 60 * 24))} giorni
                          </div>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{new Date(order.createdAt).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Azioni */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/ordini/${order.id}`}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                        >
                          <FiEye className="w-4 h-4" />
                          <span>Apri</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * pagination.limit) + 1} - {Math.min(currentPage * pagination.limit, pagination.totalOrders)} di {pagination.totalOrders} ordini
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className={`flex items-center space-x-1 px-3 py-2 border rounded-lg transition ${
                    pagination.hasPreviousPage
                      ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  }`}
                >
                  <FiChevronLeft className="w-4 h-4" />
                  <span>Precedente</span>
                </button>

                {/* Numeri pagina */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 border rounded-lg transition ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`flex items-center space-x-1 px-3 py-2 border rounded-lg transition ${
                    pagination.hasNextPage
                      ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  }`}
                >
                  <span>Successiva</span>
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicatore ordini inevasi */}
        {orders.some(order => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) && (
          <div className="bg-blue-50 border-t border-blue-200 px-6 py-3">
            <p className="text-xs text-blue-700 flex items-center space-x-1">
              <FiClock className="w-3 h-3" />
              <span>Gli ordini inevasi (evidenziati in giallo) sono visualizzati per primi</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
