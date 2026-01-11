'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Product } from '@/types'
import { FiSave, FiX, FiArrowLeft, FiPlus, FiMinus, FiInfo, FiImage, FiFile } from 'react-icons/fi'
import Link from 'next/link'
import Image from 'next/image'
import {
  getAllProductTypes,
  getProductTypeConfig,
  ProductTypeField,
} from '@/lib/productTypes'

export default function ModificaProdottoPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    vatRate: undefined,
    image: '/images/placeholder.svg',
    technicalSheet: undefined,
    categoryId: '',
    productType: '',
    customFields: {},
    brand: '',
    partNumber: '',
    compatibility: '',
    sku: '',
    stockQuantity: 0,
    lowStockThreshold: undefined,
    active: true,
    featured: false,
    height: undefined,
    width: undefined,
    depth: undefined,
    weight: undefined,
  })
  
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
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
  const [activeOffer, setActiveOffer] = useState<{
    id: string
    discountPercent: number
    endDate: string
  } | null>(null)

  const productTypes = getAllProductTypes()
  const selectedCategoryName = categories.find(c => c.id === formData.categoryId)?.name || ''
  const availableProductTypes = useMemo(() => {
    if (!selectedCategoryName) return productTypes
    return productTypes.filter((type) => type.category === selectedCategoryName)
  }, [selectedCategoryName, productTypes])

  const selectedProductTypeConfig = formData.productType
    ? getProductTypeConfig(formData.productType)
    : null

  // Carica categorie
  useEffect(() => {
    async function loadCategories() {
      try {
        // Usa API admin per ottenere tutte le categorie (incluse inattive)
        const response = await fetch('/api/admin/categories', {
          headers: {
            'x-user-id': currentUser?.id || '',
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
        } else {
          // Fallback all'API pubblica se admin non disponibile
          const publicResponse = await fetch('/api/categories', {
            headers: {
              'x-user-id': currentUser?.id || '',
            },
          })
          if (publicResponse.ok) {
            const publicData = await publicResponse.json()
            setCategories(publicData.categories || [])
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento categorie:', error)
      }
    }
    if (currentUser?.id) {
      loadCategories()
    }
  }, [currentUser?.id])

  // Carica prodotto
  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true)
        const response = await fetch(`/api/products/${productId}`, {
          headers: {
            'x-include-inactive': 'true',
            'x-user-id': currentUser?.id || '',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento prodotto')
        }

        const data = await response.json()
        if (data.product) {
          const prod = data.product
          setProduct(prod)
          setFormData({
            name: prod.name || '',
            description: prod.description || '',
            price: prod.price || 0,
            vatRate: (prod as any).vatRate ?? undefined,
            image: prod.image || '/images/placeholder.svg',
            technicalSheet: prod.technicalSheet,
            categoryId: prod.categoryId || '',
            productType: prod.productType || prod.productTypeId || '',
            customFields: prod.customFields || {},
            brand: prod.brand || '',
            partNumber: prod.partNumber || '',
            compatibility: prod.compatibility || '',
            sku: prod.sku || '',
            stockQuantity: prod.stockQuantity || 0,
            lowStockThreshold: prod.lowStockThreshold,
            active: prod.active !== undefined ? prod.active : true,
            featured: prod.featured || false,
            height: prod.height,
            width: prod.width,
            depth: prod.depth,
            weight: prod.weight,
          })
          setImagePreview(prod.image || '/images/placeholder.svg')
          setTechnicalSheetPreview(prod.technicalSheet || '')
        }
      } catch (error) {
        console.error('Errore nel caricamento prodotto:', error)
        alert('Errore nel caricamento prodotto')
      } finally {
        setLoading(false)
      }
    }
    async function loadOffers() {
      if (!currentUser?.id || !productId) return
      try {
        // Carica offerta attiva
        const activeOfferResponse = await fetch(`/api/products/${productId}/active-offer`, {
          cache: 'no-store',
        })
        if (activeOfferResponse.ok) {
          const activeOfferData = await activeOfferResponse.json()
          if (activeOfferData.offer) {
            setActiveOffer(activeOfferData.offer)
            setHasOffer(true)
            setOfferDiscountPercent(activeOfferData.offer.discountPercent)
            setOfferEndDate(new Date(activeOfferData.offer.endDate).toISOString().split('T')[0])
          }
        }

        // Carica tutte le offerte (storico)
        const offersResponse = await fetch(`/api/admin/products/${productId}/offers`, {
          headers: {
            'x-user-id': currentUser.id,
          },
          cache: 'no-store',
        })
        if (offersResponse.ok) {
          const offersData = await offersResponse.json()
          setPreviousOffers(offersData.offers || [])
        }
      } catch (error) {
        console.error('Errore nel caricamento offerte:', error)
      }
    }

    if (productId && currentUser?.id) {
      loadProduct()
      loadOffers()
    }
  }, [productId, currentUser?.id])

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData({
      ...formData,
      customFields: {
        ...formData.customFields,
        [fieldName]: value,
      },
    })
  }

  const renderField = (field: ProductTypeField) => {
    const value = formData.customFields?.[field.name] ?? field.defaultValue ?? ''

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            required={field.required}
            value={value as string}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={field.placeholder}
          />
        )
      case 'number':
        return (
          <input
            type="number"
            required={field.required}
            value={value as number}
            onChange={(e) => handleCustomFieldChange(field.name, parseFloat(e.target.value) || 0)}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={field.placeholder}
          />
        )
      case 'select':
        return (
          <select
            required={field.required}
            value={value as string}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Seleziona...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )
      case 'toggle':
        return (
          <select
            required={field.required}
            value={value as string}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )
      case 'textarea':
        return (
          <textarea
            required={field.required}
            value={value as string}
            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            placeholder={field.placeholder}
          />
        )
      default:
        return null
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Il file deve essere un\'immagine')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Il file è troppo grande (massimo 5MB)')
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTechnicalSheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('La scheda tecnica deve essere un file PDF')
        return
      }
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
    if (!currentUser?.id) {
      alert('Utente non autenticato')
      return
    }

    setSaving(true)
    try {
      // Usa FormData se ci sono file da caricare, altrimenti JSON
      const hasFiles = imageFile || technicalSheetFile
      const formDataToSend = hasFiles ? new FormData() : null

      let updateData: any = {}

      if (hasFiles && formDataToSend) {
        // Usa FormData per supportare upload file
        formDataToSend.append('name', formData.name || '')
        formDataToSend.append('description', formData.description || '')
        formDataToSend.append('price', String(formData.price || 0))
        if (formData.vatRate !== undefined && formData.vatRate !== null) {
          formDataToSend.append('vatRate', String(formData.vatRate))
        }
        formDataToSend.append('categoryId', formData.categoryId || '')
        formDataToSend.append('productTypeId', formData.productType || '')
        formDataToSend.append('brand', formData.brand || '')
        formDataToSend.append('partNumber', formData.partNumber || '')
        formDataToSend.append('compatibility', formData.compatibility || '')
        formDataToSend.append('sku', formData.sku || '')
        formDataToSend.append('stockQuantity', String(formData.stockQuantity || 0))
        if (formData.lowStockThreshold !== undefined && formData.lowStockThreshold !== null) {
          formDataToSend.append('lowStockThreshold', String(formData.lowStockThreshold))
        }
        formDataToSend.append('active', String(formData.active))
        formDataToSend.append('featured', String(formData.featured || false))
        formDataToSend.append('customFields', JSON.stringify(formData.customFields || {}))

        if (formData.height) formDataToSend.append('height', String(formData.height))
        if (formData.width) formDataToSend.append('width', String(formData.width))
        if (formData.depth) formDataToSend.append('depth', String(formData.depth))
        if (formData.weight) formDataToSend.append('weight', String(formData.weight))

        if (imageFile) {
          formDataToSend.append('image', imageFile)
        } else if (formData.image && formData.image !== product?.image) {
          formDataToSend.append('imageUrl', formData.image)
        }

        if (technicalSheetFile) {
          formDataToSend.append('technicalSheet', technicalSheetFile)
        } else if (formData.technicalSheet) {
          formDataToSend.append('technicalSheetUrl', formData.technicalSheet)
        }
      } else {
        // Usa JSON se non ci sono file
        updateData = {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          vatRate: formData.vatRate !== undefined && formData.vatRate !== null ? formData.vatRate : null,
          categoryId: formData.categoryId,
          productTypeId: formData.productType || null,
          brand: formData.brand || null,
          partNumber: formData.partNumber || null,
          compatibility: formData.compatibility || null,
          sku: formData.sku || null,
          stockQuantity: formData.stockQuantity || 0,
          lowStockThreshold: formData.lowStockThreshold !== undefined && formData.lowStockThreshold !== null ? formData.lowStockThreshold : null,
          active: formData.active,
          featured: formData.featured || false,
          customFields: formData.customFields || {},
        }

        if (formData.height) updateData.height = formData.height
        if (formData.width) updateData.width = formData.width
        if (formData.depth) updateData.depth = formData.depth
        if (formData.weight) updateData.weight = formData.weight

        if (formData.image && formData.image !== product?.image) {
          updateData.imageUrl = formData.image
        }

        if (formData.technicalSheet) {
          updateData.technicalSheetUrl = formData.technicalSheet
        }
      }

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: hasFiles
          ? {
              'x-user-id': currentUser.id,
            }
          : {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
            },
        body: hasFiles && formDataToSend ? formDataToSend : JSON.stringify(updateData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento prodotto')
      }

      const data = await response.json()
      
      // Se c'è un'offerta da creare/aggiornare, gestiscila
      if (hasOffer && offerDiscountPercent && offerEndDate) {
        try {
          const offerResponse = await fetch(`/api/admin/products/${productId}/offers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
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
            alert('Prodotto aggiornato con successo, ma errore nella creazione dell\'offerta. Puoi crearla successivamente.')
          } else {
            // Ricarica le offerte
            const offersResponse = await fetch(`/api/admin/products/${productId}/offers`, {
              headers: {
                'x-user-id': currentUser.id,
              },
              cache: 'no-store',
            })
            if (offersResponse.ok) {
              const offersData = await offersResponse.json()
              setPreviousOffers(offersData.offers || [])
            }
          }
        } catch (offerError) {
          console.error('Errore nella creazione offerta:', offerError)
          // Non bloccare il salvataggio del prodotto se l'offerta fallisce
          alert('Prodotto aggiornato con successo, ma errore nella creazione dell\'offerta. Puoi crearla successivamente.')
        }
      }
      
      alert('Prodotto aggiornato con successo!')
      router.push('/admin/prodotti')
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error)
      alert(error.message || 'Errore nell\'aggiornamento del prodotto')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento prodotto...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Prodotto non trovato</p>
        <Link href="/admin/prodotti" className="text-primary-600 hover:text-primary-700">
          Torna alla lista prodotti
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center space-x-4 mb-8">
        <Link
          href="/admin/prodotti"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Modifica Prodotto</h1>
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
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Prezzo senza IVA</p>
          </div>

          {/* Aliquota IVA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aliquota IVA (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.vatRate ?? ''}
              onChange={(e) => setFormData({ ...formData, vatRate: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. 22 per 22%"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.vatRate && formData.price > 0
                ? `Prezzo con IVA: €${((formData.price * (1 + formData.vatRate / 100))).toFixed(2)}`
                : 'Lascia vuoto per prezzo senza IVA'}
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
                  onChange={(e) => {
                    setHasOffer(e.target.checked)
                    if (!e.target.checked) {
                      setOfferDiscountPercent('')
                      setOfferEndDate('')
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="hasOffer" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Attiva offerta
                </label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!showPreviousOffers && currentUser?.id) {
                    try {
                      const offersResponse = await fetch(`/api/admin/products/${productId}/offers`, {
                        headers: {
                          'x-user-id': currentUser.id,
                        },
                        cache: 'no-store',
                      })
                      if (offersResponse.ok) {
                        const offersData = await offersResponse.json()
                        setPreviousOffers(offersData.offers || [])
                      }
                    } catch (error) {
                      console.error('Errore nel caricamento offerte:', error)
                    }
                  }
                  setShowPreviousOffers(!showPreviousOffers)
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
                {offerDiscountPercent && formData.price > 0 && (
                  <div className="bg-white rounded p-3 border border-yellow-300">
                    <p className="text-sm font-medium text-gray-700 mb-1">Anteprima Prezzo:</p>
                    <p className="text-xs text-gray-500 line-through">
                      Prezzo originale: €{((formData.vatRate && formData.vatRate > 0)
                        ? formData.price * (1 + formData.vatRate / 100)
                        : formData.price).toFixed(2)}
                    </p>
                    <p className="text-lg font-bold text-primary-600">
                      Prezzo scontato: €{((formData.vatRate && formData.vatRate > 0)
                        ? formData.price * (1 + formData.vatRate / 100) * (1 - Number(offerDiscountPercent) / 100)
                        : formData.price * (1 - Number(offerDiscountPercent) / 100)).toFixed(2)}
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
                            offer.isActive && new Date(offer.endDate) >= new Date() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {offer.isActive && new Date(offer.endDate) >= new Date() ? 'Attiva' : 'Scaduta'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantità Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantità Stock *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.stockQuantity || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  stockQuantity: parseInt(e.target.value) || 0,
                  inStock: parseInt(e.target.value) > 0,
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Soglia Stock Basso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soglia Reminder Stock (quantità)
            </label>
            <input
              type="number"
              min="0"
              value={formData.lowStockThreshold ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lowStockThreshold: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. 10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Riceverai un reminder quando la quantità scende sotto questa soglia (opzionale)
            </p>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <select
              required
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  categoryId: e.target.value,
                  productType: '', // Reset tipo quando cambia categoria
                  customFields: {},
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

          {/* Tipo Prodotto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo Prodotto
            </label>
            <select
              value={formData.productType || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  productType: e.target.value,
                  customFields: {},
                })
              }
              disabled={!formData.categoryId}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {formData.categoryId
                  ? 'Seleziona tipo prodotto'
                  : 'Seleziona prima una categoria'}
              </option>
              {availableProductTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca
            </label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. Castrol, Shell, etc."
            />
          </div>

          {/* Part Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codice Produttore (Part Number)
            </label>
            <input
              type="text"
              value={formData.partNumber || ''}
              onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Es. 12345678"
            />
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

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Codice Prodotto (SKU)
            </label>
            <input
              type="text"
              value={formData.sku || ''}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Codice univoco prodotto"
            />
          </div>

          {/* Dimensioni e Peso */}
          <div className="md:col-span-2 border-t pt-6 mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Dimensioni e Peso (per spedizione)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altezza (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Altezza"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Larghezza (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.width || ''}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Larghezza"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profondità (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.depth || ''}
                  onChange={(e) => setFormData({ ...formData, depth: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Profondità"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Peso"
                />
              </div>
            </div>
          </div>

          {/* Campi Dinamici basati sul Tipo Prodotto */}
          {selectedProductTypeConfig && selectedProductTypeConfig.fields.length > 0 && (
            <div className="md:col-span-2 border-t pt-6 mt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Caratteristiche Specifiche ({selectedProductTypeConfig.name})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProductTypeConfig.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immagine */}
          <div className="md:col-span-2 border-t pt-6 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Immagine Prodotto
            </label>
            {imagePreview && (
              <div className="mb-4 relative w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition cursor-pointer w-full">
                  <FiImage className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {imageFile ? imageFile.name : 'Carica Nuova Foto Prodotto'}
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
                  URL Immagine
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
          <div className="md:col-span-2 border-t pt-6 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheda Tecnica (PDF)
            </label>
            {technicalSheetPreview && (
              <p className="text-sm text-gray-600 mb-2">
                {technicalSheetFile ? technicalSheetFile.name : technicalSheetPreview}
              </p>
            )}
            <label className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition cursor-pointer w-full">
              <FiFile className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">
                {technicalSheetFile ? technicalSheetFile.name : 'Carica Scheda Tecnica (PDF)'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleTechnicalSheetChange}
                className="hidden"
                id="technical-sheet-upload"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Formato supportato: PDF (max 10MB)
            </p>
          </div>

          {/* Stato Prodotto */}
          <div className="md:col-span-2 border-t pt-6 mt-4">
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Prodotto Attivo</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.featured || false}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Prodotto in Evidenza</span>
              </label>
            </div>
          </div>
        </div>

        {/* Pulsanti Azione */}
        <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t">
          <Link
            href="/admin/prodotti"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FiSave className="w-5 h-5" />
            <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
