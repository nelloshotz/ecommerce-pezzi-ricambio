'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { FiAlertTriangle, FiPackage, FiEdit, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'

interface LowStockProduct extends Product {
  category?: {
    id: string
    name: string
    slug: string
  }
}

export default function AdminStockBassoPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [products, setProducts] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [criticalProducts, setCriticalProducts] = useState<LowStockProduct[]>([])
  const [lowProducts, setLowProducts] = useState<LowStockProduct[]>([])

  useEffect(() => {
    async function loadLowStockProducts() {
      if (!user?.id) return

      try {
        setLoading(true)
        const response = await fetch('/api/admin/inventory/alerts', {
          headers: {
            'x-user-id': user.id,
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento prodotti')
        }

        const data = await response.json()
        const allProducts = [
          ...(data.criticalStockProducts || []),
          ...(data.lowStockProducts || []),
        ]

        setProducts(allProducts)
        setCriticalProducts(data.criticalStockProducts || [])
        setLowProducts(data.lowStockProducts || [])
      } catch (error) {
        console.error('Errore nel caricamento prodotti con stock basso:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      loadLowStockProducts()
    }
  }, [user?.id])

  const handleEditProduct = (productId: string) => {
    router.push(`/admin/prodotti/${productId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento prodotti...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Torna alla dashboard"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-2">Prodotti con Stock Basso</h1>
            <p className="text-gray-600">
              Prodotti che hanno raggiunto la soglia minima di stock
            </p>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale Prodotti</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <FiPackage className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Basso</p>
              <p className="text-2xl font-bold text-yellow-600">{lowProducts.length}</p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Critico</p>
              <p className="text-2xl font-bold text-red-600">{criticalProducts.length}</p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Lista Prodotti */}
      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Nessun prodotto con stock basso</p>
          <p className="text-gray-500 text-sm mt-2">
            Tutti i prodotti hanno stock sufficiente
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prodotto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Attuale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Soglia Minima
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => {
                  const isCritical = criticalProducts.some((p) => p.id === product.id)
                  const hasReachedThreshold = product.lowStockThreshold !== null &&
                                            product.lowStockThreshold !== undefined &&
                                            product.stockQuantity <= product.lowStockThreshold

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image && (
                            <div className="flex-shrink-0 h-12 w-12 mr-4">
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="h-12 w-12 object-cover rounded"
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            {product.brand && (
                              <div className="text-sm text-gray-500">
                                {product.brand}
                              </div>
                            )}
                            {product.sku && (
                              <div className="text-xs text-gray-400">
                                SKU: {product.sku}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.category?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {product.stockQuantity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
                            ? product.lowStockThreshold
                            : 'Non impostata'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCritical ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Critico
                          </span>
                        ) : hasReachedThreshold ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Soglia Raggiunta
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Basso
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditProduct(product.id)}
                          className="flex items-center space-x-1 text-primary-600 hover:text-primary-900 transition"
                        >
                          <FiEdit className="w-4 h-4" />
                          <span>Modifica</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

