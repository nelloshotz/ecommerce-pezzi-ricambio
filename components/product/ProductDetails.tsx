'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Product } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { FiShoppingCart, FiTag, FiPackage, FiArrowLeft } from 'react-icons/fi'

interface ProductDetailsProps {
  product: Product
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const router = useRouter()
  const addItem = useCartStore(state => state.addItem)
  const { user, isAuthenticated } = useAuthStore()
  const [quantity, setQuantity] = useState(1)
  const [activeOffer, setActiveOffer] = useState<{
    discountPercent: number
    endDate: string
  } | null>(null)

  useEffect(() => {
    async function loadOffer() {
      try {
        const response = await fetch(`/api/products/${product.id}/active-offer`, {
          cache: 'no-store',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.offer) {
            setActiveOffer(data.offer)
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento offerta:', error)
      }
    }
    loadOffer()
  }, [product.id])

  const handleAddToCart = async () => {
    // Se l'utente non è loggato, reindirizza al login
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    
    await addItem(product, quantity, user?.id)
    setQuantity(1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FiArrowLeft className="w-5 h-5 mr-2" />
        <span>Torna indietro</span>
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
          <Image
            src={product.image || '/images/placeholder.svg'}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div>
          {product.category && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <FiTag className="w-4 h-4 mr-1" />
              {product.category}
            </div>
          )}

          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          <div className="mb-6">
            {activeOffer ? (
              <>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl text-gray-400 line-through">
                    €{((product as any).vatRate && (product as any).vatRate > 0
                      ? product.price * (1 + (product as any).vatRate / 100)
                      : product.price).toFixed(2)}
                  </span>
                  <div className="text-4xl font-bold text-primary-600">
                    €{((product as any).vatRate && (product as any).vatRate > 0
                      ? product.price * (1 + (product as any).vatRate / 100) * (1 - activeOffer.discountPercent / 100)
                      : product.price * (1 - activeOffer.discountPercent / 100)).toFixed(2)}
                  </div>
                </div>
                <p className="text-sm text-green-600 font-medium mb-1">
                  Sconto del {activeOffer.discountPercent}% fino al {new Date(activeOffer.endDate).toLocaleDateString('it-IT')}
                </p>
                {(product as any).vatRate && (product as any).vatRate > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    IVA {(product as any).vatRate}% inclusa
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-primary-600">
                  €{((product as any).vatRate && (product as any).vatRate > 0
                    ? product.price * (1 + (product as any).vatRate / 100)
                    : product.price).toFixed(2)}
                </div>
                {(product as any).vatRate && (product as any).vatRate > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    IVA {(product as any).vatRate}% inclusa
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-4 mb-6">
            {product.brand && (
              <div>
                <span className="font-semibold">Marca: </span>
                <span>{product.brand}</span>
              </div>
            )}
            {product.partNumber && (
              <div>
                <span className="font-semibold">Codice: </span>
                <span>{product.partNumber}</span>
              </div>
            )}
            <div className="flex items-center">
              <FiPackage className="w-5 h-5 mr-2" />
              <span className="font-semibold">Disponibilità: </span>
              <span
                className={`ml-2 font-medium ${
                  product.stockQuantity === 0
                    ? 'text-orange-600'
                    : product.inStock
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {product.stockQuantity === 0
                  ? 'Sold Out - In Restock'
                  : product.inStock
                  ? `In magazzino (${product.stockQuantity} disponibili)`
                  : 'Non disponibile'}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Descrizione</h2>
            <p className="text-gray-700">{product.description}</p>
          </div>

          {product.inStock && product.stockQuantity > 0 && product.active && (
            <div className="border-t pt-6">
              <div className="flex items-center space-x-4 mb-4">
                <label htmlFor="quantity" className="font-semibold">
                  Quantità:
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stockQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="border rounded px-3 py-2 w-20 text-center"
                />
                <span className="text-sm text-gray-600">
                  (Massimo {product.stockQuantity} disponibili)
                </span>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center space-x-2 text-lg"
              >
                <FiShoppingCart />
                <span>Aggiungi al Carrello</span>
              </button>
            </div>
          )}
          {product.stockQuantity === 0 && (
            <div className="border-t pt-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 font-semibold text-center">
                  ⚠️ Sold Out - In Restock
                </p>
                <p className="text-orange-700 text-sm text-center mt-2">
                  Questo prodotto è temporaneamente esaurito. Controlla presto per la disponibilità aggiornata.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

