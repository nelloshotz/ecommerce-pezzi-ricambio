'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { FiSave, FiX, FiArrowLeft, FiInfo, FiImage, FiFile, FiXCircle, FiRefreshCw } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'
import { generateProductCode } from '@/lib/productCodeGenerator'

export default function NuovoProdottoPage() {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    vatRate: undefined,
    image: '/images/placeholder.svg',
    category: '',
    brand: '',
    partNumber: '',
    compatibility: '',
    inStock: true,
    stockQuantity: 0,
    reservedQuantity: 0,
    lowStockThreshold: undefined,
    active: true,
    height: undefined,
    width: undefined,
    depth: undefined,
    weight: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [productCode, setProductCode] = useState<string>('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [codeError, setCodeError] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [technicalSheetFile, setTechnicalSheetFile] = useState<File | null>(null)
  const [technicalSheetPreview, setTechnicalSheetPreview] = useState<string>('')
  const [hasOffer, setHasOffer] = useState(false)
  const [offerDiscountPercent, setOfferDiscountPercent] = useState<number | ''>('')
  const [offerEndDate, setOfferEndDate] = useState<string>('')
  const [showPreviousOffers, setShowPreviousOffers] = useState(false)
  const [previousOffers, setPreviousOffers] = useState<Array<{
    id: string
    discountPercent: number
    startDate: string
    endDate: string
    isActive: boolean
  }>>([])

  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  
  // Carica categorie dal database
  useEffect(() => {
    async function loadCategories() {
      try {
        // Usa API admin per ottenere tutte le categorie (incluse inattive)
        if (currentUser?.id) {
          const response = await fetch('/api/admin/categories', {
            headers: {
              'x-user-id': currentUser.id,
            },
          })
          if (response.ok) {
            const data = await response.json()
            // Filtra solo categorie attive per il form prodotto
            const activeCategories = (data.categories || []).filter((cat: any) => cat.active)
            setCategories(activeCategories.map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
            })))
            return
          }
        }
        // Fallback all'API pubblica se admin non disponibile
        const publicResponse = await fetch('/api/categories', {
          headers: currentUser?.id ? {
            'x-user-id': currentUser.id,
          } : {},
        })
        if (publicResponse.ok) {
          const publicData = await publicResponse.json()
          setCategories(publicData.categories || [])
        }
      } catch (error) {
        console.error('Errore nel caricamento categorie:', error)
      }
    }
    loadCategories()
  }, [currentUser?.id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Verifica tipo file (solo immagini)
      if (!file.type.startsWith('image/')) {
        alert('Il file deve essere un\'immagine')
        return
      }

      // Verifica dimensione (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Il file è troppo grande (massimo 5MB)')
        return
      }

      setImageFile(file)
      
      // Crea preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
        setFormData({ ...formData, image: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTechnicalSheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Verifica tipo file (solo PDF)
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('La scheda tecnica deve essere un file PDF')
        return
      }

      // Verifica dimensione (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Il file è troppo grande (massimo 10MB)')
        return
      }

      setTechnicalSheetFile(file)
      setTechnicalSheetPreview(file.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Crea FormData per inviare file
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name || '')
      formDataToSend.append('description', formData.description || '')
      formDataToSend.append('price', String(formData.price || 0))
      if (formData.vatRate !== undefined && formData.vatRate !== null) {
        formDataToSend.append('vatRate', String(formData.vatRate))
      }
      formDataToSend.append('categoryId', formData.category || '')
      formDataToSend.append('brand', formData.brand || '')
      formDataToSend.append('partNumber', formData.partNumber || '')
      formDataToSend.append('compatibility', formData.compatibility || '')
      
      // Valida che il codice prodotto sia presente
      if (!productCode || productCode.trim() === '') {
        alert('Il Codice Prodotto Univoco (SKU) è obbligatorio. Generalo automaticamente o inseriscilo manualmente.')
        setLoading(false)
        return
      }

      if (codeError) {
        alert('Il codice prodotto inserito non è valido o è già in uso.')
        setLoading(false)
        return
      }

      formDataToSend.append('sku', productCode.trim().toUpperCase())
      formDataToSend.append('stockQuantity', String(formData.stockQuantity || 0))
      if (formData.lowStockThreshold !== undefined && formData.lowStockThreshold !== null && formData.lowStockThreshold > 0) {
        formDataToSend.append('lowStockThreshold', String(formData.lowStockThreshold))
      }
      formDataToSend.append('active', String(formData.active || false))
      
      // Dimensioni e peso
      if (formData.height !== undefined && formData.height !== null && formData.height > 0) {
        formDataToSend.append('height', String(formData.height))
      }
      if (formData.width !== undefined && formData.width !== null && formData.width > 0) {
        formDataToSend.append('width', String(formData.width))
      }
      if (formData.depth !== undefined && formData.depth !== null && formData.depth > 0) {
        formDataToSend.append('depth', String(formData.depth))
      }
      if (formData.weight !== undefined && formData.weight !== null && formData.weight > 0) {
        formDataToSend.append('weight', String(formData.weight))
      }

      // Aggiungi file se presenti
      if (imageFile) {
        formDataToSend.append('image', imageFile)
      } else if (formData.image) {
        formDataToSend.append('imageUrl', formData.image)
      }

      if (technicalSheetFile) {
        formDataToSend.append('technicalSheet', technicalSheetFile)
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        let errorMessage = 'Errore nel salvataggio del prodotto'
        try {
          const data = await response.json()
          errorMessage = data.error || `Errore ${response.status}: ${response.statusText}`
        } catch (parseError) {
          // Se la risposta non è JSON, usa il testo della risposta o lo status
          errorMessage = `Errore ${response.status}: ${response.statusText || 'Errore sconosciuto'}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Se c'è un'offerta da creare, creala
      if (hasOffer && offerDiscountPercent && offerEndDate && data.product?.id) {
        try {
          const offerResponse = await fetch(`/api/admin/products/${data.product.id}/offers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser?.id || '',
            },
            body: JSON.stringify({
              discountPercent: Number(offerDiscountPercent),
              endDate: offerEndDate,
            }),
          })

          if (!offerResponse.ok) {
            const offerError = await offerResponse.json()
            console.error('Errore nella creazione offerta:', offerError)
            // Non bloccare il salvataggio del prodotto se l'offerta fallisce
            alert('Prodotto creato con successo, ma errore nella creazione dell\'offerta. Puoi crearla successivamente.')
          }
        } catch (offerError) {
          console.error('Errore nella creazione offerta:', offerError)
          // Non bloccare il salvataggio del prodotto se l'offerta fallisce
          alert('Prodotto creato con successo, ma errore nella creazione dell\'offerta. Puoi crearla successivamente.')
        }
      }
      
      alert('Prodotto creato con successo!')
      router.push('/admin/prodotti')
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error)
      // Mostra il messaggio di errore specifico se disponibile
      const errorMessage = error?.message || error?.error || 'Errore nel salvataggio del prodotto. Controlla i campi obbligatori e riprova.'
      alert(`Errore: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Aggiorna inStock quando cambia stockQuantity
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      inStock: (prev.stockQuantity || 0) > 0,
    }))
  }, [formData.stockQuantity])

  return (
    <div>
      <div className="flex items-center space-x-4 mb-8">
        <Link
          href="/admin/prodotti"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Nuovo Prodotto</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome Prodotto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Prodotto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. Olio Motore 10W-40 Sintetico"
            />
          </div>

          {/* Descrizione */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              placeholder="Descrizione dettagliata del prodotto"
            />
          </div>

          {/* Prezzo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prezzo (€) *
            </label>
            <input
              type="text"
              required
              value={formData.price && formData.price > 0 ? formData.price.toFixed(2).replace('.', ',') : ''}
              onChange={(e) => {
                // Permette virgola o punto come separatore decimale
                let value = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
                // Rimuove punti multipli o virgole multiple
                const parts = value.split('.')
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('')
                }
                // Se il campo è vuoto, imposta 0, altrimenti parseFloat
                const numValue = value === '' || value === '-' ? 0 : (parseFloat(value) || 0)
                setFormData({ ...formData, price: numValue })
              }}
              placeholder="0,00"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Prezzo senza IVA (puoi usare virgola o punto)</p>
          </div>

          {/* Aliquota IVA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aliquota IVA (%)
            </label>
            <input
              type="text"
              value={formData.vatRate !== undefined && formData.vatRate !== null ? formData.vatRate.toString().replace('.', ',') : ''}
              onChange={(e) => {
                // Permette virgola o punto come separatore decimale
                let value = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
                // Rimuove punti multipli o virgole multiple
                const parts = value.split('.')
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('')
                }
                const numValue = value ? parseFloat(value) : undefined
                // Limita a 100
                if (numValue !== undefined && numValue > 100) {
                  return
                }
                setFormData({ ...formData, vatRate: numValue })
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. 22 o 22,5"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.vatRate && formData.price && formData.price > 0
                ? `Prezzo con IVA: €${(((formData.price || 0) * (1 + formData.vatRate / 100))).toFixed(2)}`
                : 'Lascia vuoto per prezzo senza IVA (puoi usare virgola o punto)'}
            </p>
          </div>

          {/* Quantità Iniziale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantità Iniziale *
            </label>
            <input
              type="text"
              required
              value={formData.stockQuantity && formData.stockQuantity > 0 ? formData.stockQuantity.toString().replace('.', ',') : ''}
              onChange={(e) => {
                // Permette virgola o punto come separatore decimale
                let value = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
                // Rimuove punti multipli o virgole multiple
                const parts = value.split('.')
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('')
                }
                const numValue = parseFloat(value) || 0
                setFormData({
                  ...formData,
                  stockQuantity: numValue,
                  inStock: numValue > 0,
                })
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              La quantità si aggiorna automaticamente in base alle vendite (puoi usare virgola o punto)
            </p>
          </div>

          {/* Soglia Stock Basso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soglia Reminder Stock (quantità)
            </label>
            <input
              type="text"
              value={formData.lowStockThreshold !== undefined && formData.lowStockThreshold !== null ? formData.lowStockThreshold.toString().replace('.', ',') : ''}
              onChange={(e) => {
                // Permette virgola o punto come separatore decimale
                let value = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.')
                // Rimuove punti multipli o virgole multiple
                const parts = value.split('.')
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('')
                }
                const numValue = value ? parseFloat(value) : undefined
                setFormData({
                  ...formData,
                  lowStockThreshold: numValue,
                })
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. 10 o 10,5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Riceverai un reminder quando la quantità scende sotto questa soglia (opzionale, puoi usare virgola o punto)
            </p>
          </div>

          {/* Sezione Offerte */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasOffer"
                  checked={hasOffer}
                  onChange={(e) => setHasOffer(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="hasOffer" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Attiva offerta
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!showPreviousOffers) {
                    // Questo sarà disponibile solo dopo la creazione del prodotto
                    // Per ora mostriamo solo il componente vuoto
                    setPreviousOffers([])
                  }
                  setShowPreviousOffers(!showPreviousOffers)
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                disabled
                title="Disponibile solo dopo la creazione del prodotto"
              >
                OFFERTE PRECEDENTI
              </button>
            </div>

            {hasOffer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentuale Sconto (%) *
                  </label>
                  <input
                    type="number"
                    required={hasOffer}
                    min="1"
                    max="100"
                    step="0.01"
                    value={offerDiscountPercent}
                    onChange={(e) => setOfferDiscountPercent(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Es. 20 per 20%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Fine Promo *
                  </label>
                  <input
                    type="date"
                    required={hasOffer}
                    value={offerEndDate}
                    onChange={(e) => setOfferEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {offerDiscountPercent && formData.price && formData.price > 0 && (
                  <div className="bg-white rounded p-3 border border-yellow-300">
                    <p className="text-sm font-medium text-gray-700 mb-1">Anteprima Prezzo:</p>
                    <p className="text-xs text-gray-500 line-through">
                      Prezzo originale: €{((formData.vatRate && formData.vatRate > 0)
                        ? (formData.price || 0) * (1 + formData.vatRate / 100)
                        : (formData.price || 0)).toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-primary-600">
                      Prezzo scontato: €{((formData.vatRate && formData.vatRate > 0)
                        ? (formData.price || 0) * (1 + formData.vatRate / 100) * (1 - Number(offerDiscountPercent) / 100)
                        : (formData.price || 0) * (1 - Number(offerDiscountPercent) / 100)).toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Sconto del {offerDiscountPercent}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {showPreviousOffers && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 mb-3">Storico Offerte</h4>
                {previousOffers.length === 0 ? (
                  <p className="text-sm text-gray-500">Nessuna offerta precedente per questo prodotto.</p>
                ) : (
                  <div className="space-y-2">
                    {previousOffers.map((offer) => (
                      <div key={offer.id} className="bg-white rounded p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Sconto: {offer.discountPercent}%
                            </p>
                            <p className="text-xs text-gray-500">
                              Dal {new Date(offer.startDate).toLocaleDateString('it-IT')} al {new Date(offer.endDate).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {offer.isActive ? 'Attiva' : 'Scaduta'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Seleziona categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Marca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca
            </label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. Bosch, Castrol, etc."
            />
          </div>

          {/* Codice Prodotto Univoco (SKU) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codice Prodotto Univoco (SKU) *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                required
                value={productCode}
                onChange={async (e) => {
                  const newCode = e.target.value.toUpperCase().trim()
                  setProductCode(newCode)
                  setCodeError('')

                  // Verifica unicità in tempo reale (debounce potrebbe essere meglio ma per ora va bene)
                  if (newCode.length > 0) {
                    try {
                      const response = await fetch(`/api/products/generate-code?code=${encodeURIComponent(newCode)}`)
                      if (response.ok) {
                        const data = await response.json()
                        if (!data.unique) {
                          setCodeError('Questo codice è già in uso. Scegli un altro codice.')
                        }
                      }
                    } catch (error) {
                      // Ignora errori di verifica
                    }
                  }
                }}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  codeError ? 'border-red-500' : ''
                }`}
                placeholder="Es. PRD-20240110-1234 oppure lascia vuoto e genera automaticamente"
              />
              <button
                type="button"
                onClick={async () => {
                  setGeneratingCode(true)
                  setCodeError('')
                  try {
                    // Ottieni categoryId e slug della categoria selezionata
                    const categoryId = formData.category || null
                    const selectedCategory = categories.find(c => c.id === formData.category)
                    const categorySlug = selectedCategory?.slug || null

                    const response = await fetch('/api/products/generate-code', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ categoryId, categorySlug }),
                    })

                    if (response.ok) {
                      const data = await response.json()
                      setProductCode(data.code)
                      setCodeError('')
                    } else {
                      throw new Error('Errore nella generazione codice')
                    }
                  } catch (error) {
                    setCodeError('Errore nella generazione automatica del codice')
                  } finally {
                    setGeneratingCode(false)
                  }
                }}
                disabled={generatingCode}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="Genera codice prodotto automaticamente"
              >
                <FiRefreshCw className={`w-4 h-4 ${generatingCode ? 'animate-spin' : ''}`} />
                <span>{generatingCode ? 'Generazione...' : 'Genera'}</span>
              </button>
            </div>
            {codeError && (
              <p className="text-xs text-red-600 mt-1">{codeError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Codice prodotto univoco. Puoi generarlo automaticamente o inserirlo manualmente.
            </p>
          </div>

          {/* Codice Produttore (Part Number) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codice Produttore (Part Number)
            </label>
            <input
              type="text"
              value={formData.partNumber || ''}
              onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. OF123 (codice del produttore)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Codice assegnato dal produttore (opzionale)
            </p>
          </div>

          {/* Compatibilità */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compatibilità
            </label>
            <textarea
              value={formData.compatibility || ''}
              onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Es. AUDI, BMW, MERCEDES oppure AUDI&#10;BMW&#10;MERCEDES (uno per riga o separati da virgola)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Marchi auto/moto compatibili con questo pezzo di ricambio. Separali con virgole o inserisci uno per riga. Questo campo è utilizzabile nella ricerca prodotti.
            </p>
          </div>

          {/* Dimensioni e Peso - Sezione separata */}
          <div className="md:col-span-2 border-t pt-6 mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Dimensioni e Peso (per calcolo spedizione)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Altezza */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altezza (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.height || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      height: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.0"
                />
                <p className="text-xs text-gray-500 mt-1">in centimetri</p>
              </div>

              {/* Larghezza */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Larghezza (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.width || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      width: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.0"
                />
                <p className="text-xs text-gray-500 mt-1">in centimetri</p>
              </div>

              {/* Profondità */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profondità (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.depth || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      depth: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.0"
                />
                <p className="text-xs text-gray-500 mt-1">in centimetri</p>
              </div>

              {/* Peso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weight: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">in chilogrammi</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start space-x-2">
              <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Questi dati sono utilizzati per il calcolo delle spese di spedizione. Possono essere inseriti successivamente se non disponibili al momento.
              </p>
            </div>
          </div>

          {/* Immagine Prodotto */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto Prodotto *
            </label>
            
            {/* Preview Immagine */}
            {(imagePreview || formData.image) && (
              <div className="mb-4 relative inline-block">
                <div className="relative w-48 h-48 border-2 border-gray-300 rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview || formData.image || '/images/placeholder.svg'}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview('')
                      setFormData({ ...formData, image: '/images/placeholder.svg' })
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                  >
                    <FiXCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition cursor-pointer w-full">
                  <FiImage className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {imageFile ? imageFile.name : 'Carica Foto Prodotto'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Formati supportati: JPG, PNG, WebP (max 5MB)
                </p>
              </div>

              <div className="text-center text-gray-500 text-sm">oppure</div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  URL Immagine (se non carichi file)
                </label>
                <input
                  type="text"
                  value={formData.image && !imageFile ? formData.image : ''}
                  onChange={(e) => {
                    if (!imageFile) {
                      setFormData({ ...formData, image: e.target.value })
                      setImagePreview(e.target.value)
                    }
                  }}
                  disabled={!!imageFile}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="/images/prodotto.jpg o https://..."
                />
              </div>
            </div>
          </div>

          {/* Scheda Tecnica */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheda Tecnica (PDF) - Opzionale
            </label>
            
            {technicalSheetPreview && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiFile className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-900 font-medium">{technicalSheetPreview}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTechnicalSheetFile(null)
                    setTechnicalSheetPreview('')
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <FiXCircle className="w-5 h-5" />
                </button>
              </div>
            )}

            <label className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition cursor-pointer w-full">
              <FiFile className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">
                {technicalSheetFile ? technicalSheetFile.name : 'Carica Scheda Tecnica PDF'}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleTechnicalSheetChange}
                className="hidden"
                id="technical-sheet-upload"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Formato supportato: PDF (max 10MB). Gli utenti potranno scaricare questa scheda tecnica dalla pagina prodotto.
            </p>
          </div>

          {/* Stato Prodotto */}
          <div className="md:col-span-2 border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Stato Prodotto
            </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active || false}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Prodotto Attivo (visibile nello store)
                </span>
              </label>
              <div className="text-sm text-gray-600">
                {formData.stockQuantity === 0
                  ? '⚠️ Prodotto mostrato come "Sold Out - In Restock"'
                  : `✓ Disponibile (${formData.stockQuantity} pezzi)`}
              </div>
            </div>
          </div>
        </div>

        {/* Bottoni */}
        <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t">
          <Link
            href="/admin/prodotti"
            className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <FiX className="w-5 h-5" />
            <span>Annulla</span>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FiSave className="w-5 h-5" />
            <span>{loading ? 'Salvataggio...' : 'Salva Prodotto'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
