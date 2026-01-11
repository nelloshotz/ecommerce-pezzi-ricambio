'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { FiSearch, FiPlus, FiEdit, FiToggleLeft, FiToggleRight, FiX } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'

export default function AdminProdottiPage() {
  const { user: currentUser } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true)
        // Usa API route per caricare prodotti (include prodotti inattivi per admin)
        const response = await fetch('/api/products?includeInactive=true', {
          headers: {
            'x-include-inactive': 'true',
            'x-user-id': currentUser?.id || '',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento prodotti')
        }

        const data = await response.json()
        setProducts(data.products || [])
      } catch (error) {
        console.error('Errore nel caricamento prodotti:', error)
        alert('Errore nel caricamento prodotti')
      } finally {
        setLoading(false)
      }
    }

    if (currentUser?.id) {
      loadProducts()
    }
  }, [currentUser?.id])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = showInactive || product.active

      return matchesSearch && matchesStatus
    })
  }, [products, searchQuery, showInactive])

  const toggleProductActive = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const newActiveStatus = !product.active

    try {
      // Aggiorna nello stato locale immediatamente (optimistic update)
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, active: newActiveStatus } : p))
      )

      // Chiama API per aggiornare nel database
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ active: newActiveStatus }),
      })

      if (!response.ok) {
        // Se fallisce, ripristina lo stato precedente
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, active: !newActiveStatus } : p))
        )
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento prodotto')
      }

      alert(`Prodotto ${newActiveStatus ? 'attivato' : 'disattivato'} con successo`)
    } catch (error: any) {
      console.error('Errore nel toggle prodotto:', error)
      alert(error.message || 'Errore nell\'aggiornamento stato prodotto')
    }
  }

  const toggleProductFeatured = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product || !product.active) {
      alert('Non puoi mettere in evidenza un prodotto inattivo')
      return
    }

    const newFeaturedStatus = !product.featured

    try {
      // Aggiorna nello stato locale immediatamente (optimistic update)
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, featured: newFeaturedStatus } : p))
      )

      // Chiama API per aggiornare nel database
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ featured: newFeaturedStatus }),
      })

      if (!response.ok) {
        // Se fallisce, ripristina lo stato precedente
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, featured: !newFeaturedStatus } : p))
        )
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento prodotto')
      }

      alert(`Prodotto ${newFeaturedStatus ? 'messo in evidenza' : 'rimosso da evidenza'} con successo`)
    } catch (error: any) {
      console.error('Errore nel toggle featured:', error)
      alert(error.message || 'Errore nell\'aggiornamento stato evidenza')
    }
  }

  const activeProducts = products.filter((p) => p.active).length
  const inactiveProducts = products.filter((p) => !p.active).length

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
        <h1 className="text-3xl font-bold">Gestione Prodotti</h1>
        <Link
          href="/admin/prodotti/nuovo"
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <FiPlus className="w-5 h-5" />
          <span>Nuovo Prodotto</span>
        </Link>
      </div>

      {/* Filtri e Ricerca */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca prodotto (nome, marca, codice, categoria)..."
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
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Mostra prodotti inattivi</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Totale: {products.length}</span>
          <span>Attivi: {activeProducts}</span>
          <span>Inattivi: {inactiveProducts}</span>
          <span>Risultati: {filteredProducts.length}</span>
        </div>
      </div>

      {/* Lista Prodotti */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Immagine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome / Codice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria / Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prezzo / Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato / Evidenza
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nessun prodotto trovato
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden">
                        <Image
                          src={product.image || '/images/placeholder.svg'}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        {product.partNumber && (
                          <div className="text-sm text-gray-500">
                            Codice: {product.partNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category}</div>
                      {product.brand && (
                        <div className="text-sm text-gray-500">{product.brand}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        €{product.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Stock: {product.stockQuantity || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleProductActive(product.id)}
                            className={`p-2 rounded-lg transition ${
                              product.active
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={product.active ? 'Disattiva prodotto' : 'Attiva prodotto'}
                          >
                            {product.active ? (
                              <FiToggleRight className="w-6 h-6" />
                            ) : (
                              <FiToggleLeft className="w-6 h-6" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleProductFeatured(product.id)}
                            className={`p-2 rounded-lg transition text-lg ${
                              product.featured
                                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            } ${!product.active ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={
                              !product.active
                                ? 'Attiva il prodotto prima di metterlo in evidenza'
                                : product.featured
                                ? 'Rimuovi da evidenza'
                                : 'Metti in evidenza (appare in homepage)'
                            }
                            disabled={!product.active}
                          >
                            ⭐
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span
                            className={`px-2 py-1 rounded-full ${
                              product.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {product.active ? 'Attivo' : 'Inattivo'}
                          </span>
                          {product.featured && (
                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                              In Evidenza
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/prodotti/${product.id}`}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center space-x-1"
                      >
                        <FiEdit className="w-4 h-4" />
                        <span>Modifica</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

