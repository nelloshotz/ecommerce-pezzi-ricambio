'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { FiSearch, FiPlus, FiEdit, FiToggleLeft, FiToggleRight, FiTrash2, FiX, FiPackage, FiInfo } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  order: number
  active: boolean
  productsCount: number
  createdAt: string
  updatedAt: string
}

export default function AdminCategoriePage() {
  const { user: currentUser } = useAuthStore()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/categories', {
          headers: {
            'x-user-id': currentUser?.id || '',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento categorie')
        }

        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Errore nel caricamento categorie:', error)
        alert('Errore nel caricamento categorie')
      } finally {
        setLoading(false)
      }
    }

    if (currentUser?.id) {
      loadCategories()
    }
  }, [currentUser?.id])

  const toggleCategoryActive = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    const newActiveStatus = !category.active

    try {
      // Aggiorna nello stato locale immediatamente (optimistic update)
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, active: newActiveStatus } : c))
      )

      // Chiama API per aggiornare nel database
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          active: newActiveStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento categoria')
      }
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento categoria:', error)
      // Ripristina stato precedente in caso di errore
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, active: !newActiveStatus } : c))
      )
      alert(error.message || 'Errore nell\'aggiornamento categoria')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria? Questa azione non può essere annullata.')) {
      return
    }

    setDeletingId(categoryId)
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || '',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'eliminazione categoria')
      }

      // Rimuovi categoria dallo stato
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      alert('Categoria eliminata con successo!')
    } catch (error: any) {
      console.error('Errore nell\'eliminazione categoria:', error)
      alert(error.message || 'Errore nell\'eliminazione categoria')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      searchQuery === '' ||
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = showInactive || category.active

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento categorie...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Gestione Categorie</h1>
        <Link
          href="/admin/categorie/nuovo"
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <FiPlus className="w-5 h-5" />
          <span>Nuova Categoria</span>
        </Link>
      </div>

      {/* Filtri e Ricerca */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca categoria (nome, descrizione, slug)..."
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
              <span className="text-sm text-gray-700">Mostra categorie inattive</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Totale: {categories.length} categorie</span>
          <span>|</span>
          <span>Attive: {categories.filter((c) => c.active).length}</span>
          <span>|</span>
          <span>Risultati: {filteredCategories.length}</span>
        </div>
      </div>

      {/* Tabella Categorie */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {searchQuery || !showInactive
                ? 'Nessuna categoria trovata'
                : 'Nessuna categoria disponibile'}
            </p>
            {!searchQuery && showInactive && (
              <Link
                href="/admin/categorie/nuovo"
                className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <FiPlus className="w-5 h-5" />
                <span>Crea la prima categoria</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prodotti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {category.image ? (
                          <Image
                            src={category.image}
                            alt={category.name}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <FiPackage className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {category.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">{category.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{category.order}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm text-gray-900">
                        <FiPackage className="w-4 h-4" />
                        <span>{category.productsCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCategoryActive(category.id)}
                        className="flex items-center space-x-2 text-sm hover:text-primary-600 transition"
                        title={category.active ? 'Disattiva categoria' : 'Attiva categoria'}
                      >
                        {category.active ? (
                          <>
                            <FiToggleRight className="w-6 h-6 text-green-500" />
                            <span className="text-green-600">Attiva</span>
                          </>
                        ) : (
                          <>
                            <FiToggleLeft className="w-6 h-6 text-gray-400" />
                            <span className="text-gray-500">Inattiva</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/admin/categorie/${category.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Modifica categoria"
                        >
                          <FiEdit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={deletingId === category.id || category.productsCount > 0}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            category.productsCount > 0
                              ? 'Non puoi eliminare categorie con prodotti associati'
                              : 'Elimina categoria'
                          }
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Eliminazione */}
      {categories.some((c) => c.productsCount > 0) && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
          <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Nota sull'eliminazione:</p>
            <p>
              Le categorie con prodotti associati non possono essere eliminate. Prima sposta o elimina i prodotti associati.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

