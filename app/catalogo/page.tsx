'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProductCard from '@/components/product/ProductCard'
import { Product } from '@/types'
import { FiSearch, FiX, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi'

interface Category {
  id: string
  name: string
  slug: string
}

export default function CatalogoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(searchParams.get('categoryId') || null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(searchParams.get('brand') || null)
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '')
  const [inStock, setInStock] = useState<string | null>(searchParams.get('inStock') || null)
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [initialLoad, setInitialLoad] = useState(true)

  // Carica categorie e brands al mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch('/api/categories', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento categorie')
        }

        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Errore nel caricamento categorie:', error)
      }
    }

    async function loadBrands() {
      try {
        const response = await fetch('/api/products?limit=1000', {
          cache: 'no-store',
        })
        if (response.ok) {
          const data = await response.json()
          const uniqueBrands = [...new Set(data.products?.filter((p: Product) => p.brand).map((p: Product) => p.brand))].sort() as string[]
          setBrands(uniqueBrands)
        }
      } catch (error) {
        console.error('Errore nel caricamento brands:', error)
      }
    }

    loadCategories()
    loadBrands()
  }, [])

  // Funzione per aggiornare URL con query params
  const updateURL = useCallback((filters: {
    q?: string
    categoryId?: string | null
    brand?: string | null
    minPrice?: string
    maxPrice?: string
    inStock?: string | null
    sortBy?: string
  }) => {
    const params = new URLSearchParams()
    if (filters.q?.trim()) params.set('q', filters.q.trim())
    if (filters.categoryId) params.set('categoryId', filters.categoryId)
    if (filters.brand) params.set('brand', filters.brand)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.inStock) params.set('inStock', filters.inStock)
    if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sortBy', filters.sortBy)

    const newUrl = params.toString() ? `/catalogo?${params.toString()}` : '/catalogo'
    router.replace(newUrl, { scroll: false })
  }, [router])

  // Funzione per cercare/filtrare prodotti via API
  const searchAndFilterProducts = useCallback(async (
    query: string,
    categoryId: string | null,
    brand: string | null,
    minPriceVal: string,
    maxPriceVal: string,
    inStockVal: string | null,
    sortByVal: string
  ) => {
    try {
      setIsSearching(true)
      setLoading(true)

      const params = new URLSearchParams()
      if (query.trim()) {
        params.set('q', query.trim())
      }
      if (categoryId) {
        params.set('categoryId', categoryId)
      }
      if (brand) {
        params.set('brand', brand)
      }
      if (minPriceVal) {
        params.set('minPrice', minPriceVal)
      }
      if (maxPriceVal) {
        params.set('maxPrice', maxPriceVal)
      }
      if (inStockVal) {
        params.set('inStock', inStockVal)
      }
      if (sortByVal) {
        params.set('sortBy', sortByVal)
      }
      params.set('limit', '100') // Limite alto per catalogo completo

      const response = await fetch(`/api/products/search?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Errore nella ricerca prodotti')
      }

      const data = await response.json()
      setProducts(data.products || [])
      setSuggestions(data.suggestions || [])
      
      // Aggiorna URL
      updateURL({ q: query, categoryId, brand, minPrice: minPriceVal, maxPrice: maxPriceVal, inStock: inStockVal, sortBy: sortByVal })
    } catch (error) {
      console.error('Errore nella ricerca prodotti:', error)
      setProducts([])
      setSuggestions([])
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }, [updateURL])

  // Funzione helper per caricare tutti i prodotti
  const loadAllProducts = useCallback(async () => {
    try {
      setLoading(true)
      setIsSearching(false)
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (sortBy && sortBy !== 'relevance') {
        params.set('sortBy', sortBy)
      }

      const response = await fetch(`/api/products?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento prodotti')
      }

      const data = await response.json()
      setProducts(data.products || [])
      updateURL({ q: '', categoryId: null, brand: null, minPrice: '', maxPrice: '', inStock: null, sortBy })
    } catch (error) {
      console.error('Errore nel caricamento prodotti:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [sortBy, updateURL])

  // Carica prodotti iniziali o con filtri da URL al mount
  useEffect(() => {
    if (!initialLoad) return
    
    setInitialLoad(false)
    const hasFiltersFromURL = searchQuery || selectedCategoryId || selectedBrand || minPrice || maxPrice || inStock || (sortBy && sortBy !== 'relevance')
    
    if (hasFiltersFromURL) {
      // Se ci sono filtri nell'URL, carica prodotti filtrati
      searchAndFilterProducts(searchQuery, selectedCategoryId, selectedBrand, minPrice, maxPrice, inStock, sortBy)
    } else {
      // Altrimenti carica tutti i prodotti
      loadAllProducts()
    }
  }, []) // Solo al mount

  // Gestione filtri (categoria, marca, prezzo, disponibilità, ordinamento) - IMMEDIATO
  useEffect(() => {
    // Skip se è il mount iniziale (già gestito sopra)
    if (initialLoad) return
    
    // Cancella eventuale timeout della ricerca testuale quando cambiano i filtri
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    
    // Verifica se ci sono filtri attivi (esclusa la ricerca testuale)
    const hasFilters = selectedCategoryId || selectedBrand || minPrice || maxPrice || inStock || (sortBy && sortBy !== 'relevance')
    
    if (!hasFilters) {
      // Nessun filtro attivo (esclusa ricerca testuale)
      // Se c'è una ricerca testuale, esegui ricerca con debounce (gestito da useEffect separato)
      // Se non c'è ricerca testuale, carica tutti i prodotti
      if (!searchQuery.trim()) {
        loadAllProducts()
      }
      return
    }

    // Se c'è almeno un filtro (esclusa ricerca testuale), esegui ricerca immediatamente
    // Include anche la ricerca testuale corrente se presente
    searchAndFilterProducts(searchQuery, selectedCategoryId, selectedBrand, minPrice, maxPrice, inStock, sortBy)
  }, [selectedCategoryId, selectedBrand, minPrice, maxPrice, inStock, sortBy, initialLoad, loadAllProducts, searchAndFilterProducts, searchQuery])

  // Gestione ricerca testuale con debounce (500ms) - solo se non ci sono altri filtri attivi
  useEffect(() => {
    // Skip se è il mount iniziale (già gestito sopra)
    if (initialLoad) return
    
    // Se non c'è query di ricerca, non fare nulla
    if (!searchQuery.trim()) {
      return
    }

    // Verifica se ci sono altri filtri attivi (esclusa ricerca testuale)
    const hasOtherFilters = selectedCategoryId || selectedBrand || minPrice || maxPrice || inStock || (sortBy && sortBy !== 'relevance')
    
    // Se ci sono altri filtri, la ricerca è già stata eseguita immediatamente dal useEffect sopra
    if (hasOtherFilters) {
      return
    }

    // Cancella timeout precedente
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Imposta nuovo timeout per la ricerca testuale
    const timeout = setTimeout(() => {
      searchAndFilterProducts(searchQuery, selectedCategoryId, selectedBrand, minPrice, maxPrice, inStock, sortBy)
    }, 500)

    searchTimeoutRef.current = timeout

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [searchQuery, initialLoad, searchAndFilterProducts, selectedCategoryId, selectedBrand, minPrice, maxPrice, inStock, sortBy])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryId(prev => prev === categoryId ? null : categoryId)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategoryId(null)
    setSelectedBrand(null)
    setMinPrice('')
    setMaxPrice('')
    setInStock(null)
    setSortBy('relevance')
    router.replace('/catalogo', { scroll: false })
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count++
    if (selectedCategoryId) count++
    if (selectedBrand) count++
    if (minPrice || maxPrice) count++
    if (inStock) count++
    if (sortBy && sortBy !== 'relevance') count++
    return count
  }, [searchQuery, selectedCategoryId, selectedBrand, minPrice, maxPrice, inStock, sortBy])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Catalogo Completo</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <FiFilter />
          <span>Filtri</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Barra Ricerca Principale */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="relative max-w-3xl mx-auto">
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
            
            {/* Suggerimenti Autocomplete */}
            {suggestions.length > 0 && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(suggestion)
                      setSuggestions([])
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                  >
                    <FiSearch className="inline w-4 h-4 mr-2 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isSearching && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Ricerca in corso...
            </p>
          )}
          {products.length > 0 && !loading && !isSearching && (
            <p className="text-center text-sm text-gray-600 mt-3">
              {products.length} {products.length === 1 ? 'prodotto trovato' : 'prodotti trovati'}
              {searchQuery.trim() && ` per "${searchQuery}"`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filtri */}
        <div
          className={`${
            showFilters ? 'block' : 'hidden'
          } lg:block space-y-6 bg-white p-6 rounded-lg shadow-md h-fit sticky top-24`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Filtri</h2>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
              >
                <FiX className="w-4 h-4" />
                <span>Pulisci</span>
              </button>
            )}
          </div>

          {/* Ordinamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ordina per
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="relevance">Rilevanza</option>
              <option value="price-asc">Prezzo: crescente</option>
              <option value="price-desc">Prezzo: decrescente</option>
              <option value="name-asc">Nome: A-Z</option>
              <option value="name-desc">Nome: Z-A</option>
              <option value="newest">Più recenti</option>
            </select>
          </div>

          {/* Filtro Categorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Categorie
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <label
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                  !selectedCategoryId
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="category"
                    checked={!selectedCategoryId}
                    onChange={() => setSelectedCategoryId(null)}
                    className="border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Tutte le categorie</span>
                </div>
              </label>
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id

                return (
                  <label
                    key={category.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                      isSelected
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="category"
                        checked={isSelected}
                        onChange={() => toggleCategory(category.id)}
                        className="border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Filtro Brand */}
          {brands.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Marca
              </label>
              <select
                value={selectedBrand || ''}
                onChange={(e) => setSelectedBrand(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Tutte le marche</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Prezzo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Prezzo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Da €</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">A €</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="999.99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Filtro Disponibilità */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Disponibilità
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 p-2 rounded cursor-pointer transition hover:bg-gray-50">
                <input
                  type="radio"
                  name="inStock"
                  checked={inStock === null}
                  onChange={() => setInStock(null)}
                  className="border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Tutti</span>
              </label>
              <label className="flex items-center space-x-2 p-2 rounded cursor-pointer transition hover:bg-gray-50">
                <input
                  type="radio"
                  name="inStock"
                  checked={inStock === 'true'}
                  onChange={() => setInStock('true')}
                  className="border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Solo disponibili</span>
              </label>
              <label className="flex items-center space-x-2 p-2 rounded cursor-pointer transition hover:bg-gray-50">
                <input
                  type="radio"
                  name="inStock"
                  checked={inStock === 'false'}
                  onChange={() => setInStock('false')}
                  className="border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Solo esauriti</span>
              </label>
            </div>
          </div>
        </div>

        {/* Lista Prodotti */}
        <div className="lg:col-span-3">
          {loading && !isSearching ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Caricamento prodotti...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">
                {searchQuery.trim() || selectedCategoryId
                  ? 'Nessun prodotto trovato con i filtri selezionati'
                  : 'Nessun prodotto disponibile al momento'}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Pulisci i filtri
                </button>
              )}
            </div>
          ) : (
            <>
              {products.length > 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  {products.length} {products.length === 1 ? 'prodotto' : 'prodotti'} trovati
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

