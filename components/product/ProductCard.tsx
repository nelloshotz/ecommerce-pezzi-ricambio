'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { FiShoppingCart, FiTag } from 'react-icons/fi'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore(state => state.addItem)
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    await addItem(product, 1)
  }

  return (
    <Link href={`/prodotto/${product.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
        <div className="relative h-48 bg-gray-200">
          <Image
            src={product.image || '/images/placeholder.svg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.stockQuantity === 0 && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-sm font-medium">
              Sold Out - In Restock
            </div>
          )}
          {!product.active && product.stockQuantity > 0 && (
            <div className="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded text-sm">
              Non Disponibile
            </div>
          )}
        </div>
        
        <div className="p-4">
          {product.category && (
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <FiTag className="w-3 h-3 mr-1" />
              {product.category}
            </div>
          )}
          
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {product.name}
          </h3>
          
          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">Marca: {product.brand}</p>
          )}
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              {activeOffer ? (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg text-gray-400 line-through">
                      €{((product as any).vatRate && (product as any).vatRate > 0
                        ? product.price * (1 + (product as any).vatRate / 100)
                        : product.price).toFixed(2)}
                    </span>
                    <span className="text-2xl font-bold text-primary-600">
                      €{((product as any).vatRate && (product as any).vatRate > 0
                        ? product.price * (1 + (product as any).vatRate / 100) * (1 - activeOffer.discountPercent / 100)
                        : product.price * (1 - activeOffer.discountPercent / 100)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    Sconto del {activeOffer.discountPercent}% fino al {new Date(activeOffer.endDate).toLocaleDateString('it-IT')}
                  </p>
                  {(product as any).vatRate && (product as any).vatRate > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      IVA {(product as any).vatRate}% inclusa
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-primary-600">
                    €{((product as any).vatRate && (product as any).vatRate > 0
                      ? product.price * (1 + (product as any).vatRate / 100)
                      : product.price).toFixed(2)}
                  </span>
                  {(product as any).vatRate && (product as any).vatRate > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      IVA {(product as any).vatRate}% inclusa
                    </p>
                  )}
                </>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || product.stockQuantity === 0 || !product.active}
              className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <FiShoppingCart />
              <span>
                {product.stockQuantity === 0
                  ? 'Sold Out'
                  : !product.active
                  ? 'Non Disponibile'
                  : 'Aggiungi'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}

