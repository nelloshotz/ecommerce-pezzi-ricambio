'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import { Product } from '@/types'
import { FiSearch, FiX } from 'react-icons/fi'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Carica prodotti featured quando non c'è ricerca
  useEffect(() => {
    if (searchQuery.trim() === '') {
      async function loadFeaturedProducts() {
        try {
          setLoading(true)
          setIsSearching(false)
          // Usa API route dedicata che segue logica: featured -> più venduti -> random
          const response = await fetch('/api/products/featured?limit=8', {
            cache: 'no-store',
          })

          if (!response.ok) {
            throw new Error('Errore nel caricamento prodotti')
          }

          const data = await response.json()
          setProducts(data.products || [])
        } catch (error) {
          console.error('Errore nel caricamento prodotti featured:', error)
          setProducts([])
        } finally {
          setLoading(false)
        }
      }

      loadFeaturedProducts()
    }
  }, [searchQuery])

  // Funzione per cercare prodotti con debounce
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      return
    }

    try {
      setIsSearching(true)
      setLoading(true)

      const params = new URLSearchParams({
        q: query.trim(),
        limit: '20',
      })

      const response = await fetch(`/api/products/search?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Errore nella ricerca prodotti')
      }

      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Errore nella ricerca prodotti:', error)
      setProducts([])
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }, [])

  // Gestione ricerca con debounce (500ms)
  useEffect(() => {
    // Cancella timeout precedente
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    if (searchQuery.trim() === '') {
      setProducts([])
      setIsSearching(false)
      return
    }

    // Imposta nuovo timeout per la ricerca
    const timeout = setTimeout(() => {
      searchProducts(searchQuery)
    }, 500)

    setSearchTimeout(timeout)

    // Cleanup
    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [searchQuery, searchProducts])

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-8">
        <p className="text-xl text-gray-600 mb-8 text-center">
          Trova tutti ciò di cui hai bisogno per il tuo veicolo
        </p>
      </section>

      {/* Barra Ricerca */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="relative max-w-2xl mx-auto">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca prodotti (nome, marca, codice prodotto, SKU)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                title="Cancella ricerca"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
          {isSearching && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Ricerca in corso...
            </p>
          )}
        </div>
        
        {/* Link Catalogo e Categorie */}
        <div className="flex justify-center gap-6 mt-6">
          <Link
            href="/catalogo"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Catalogo
          </Link>
          <Link
            href="/categorie"
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Categorie
          </Link>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {searchQuery.trim() ? `Risultati ricerca: "${searchQuery}"` : 'Prodotti in Evidenza'}
          </h2>
          {!searchQuery.trim() && (
            <Link 
              href="/catalogo" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Vedi tutto →
            </Link>
          )}
        </div>

        {loading && !isSearching ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Caricamento prodotti...</p>
          </div>
        ) : products.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-2">
              {searchQuery.trim() 
                ? `Nessun prodotto trovato per "${searchQuery}"`
                : 'Nessun prodotto disponibile al momento'}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary-600 hover:text-primary-700 font-medium mt-2"
              >
                Mostra prodotti in evidenza
              </button>
            )}
          </div>
        ) : (
          <>
            {searchQuery.trim() && products.length > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                Trovati {products.length} {products.length === 1 ? 'prodotto' : 'prodotti'}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

