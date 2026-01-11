'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiGift, FiAlertCircle, FiCheckCircle, FiCopy, FiTrash2, FiRefreshCw } from 'react-icons/fi'

interface Coupon {
  id: string
  code: string
  discountPercent: number
  isUsed: boolean
  usedAt: Date | null
  usedByOrderId: string | null
  usedByUserId: string | null
  createdAt: Date
}

export default function AdminCouponPage() {
  const { user } = useAuthStore()

  const [quantity, setQuantity] = useState<number>(1)
  const [discountPercent, setDiscountPercent] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(true)

  const discountOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 100]

  // Il layout admin già gestisce l'autenticazione, quindi non serve un controllo aggiuntivo

  useEffect(() => {
    async function loadCoupons() {
      if (!user?.id) return

      try {
        setLoadingCoupons(true)
        const response = await fetch('/api/admin/coupons', {
          headers: {
            'x-user-id': user?.id || '',
          },
        })

        if (!response.ok) {
          throw new Error('Errore nel caricamento coupon')
        }

        const data = await response.json()
        setCoupons(data.coupons || [])
      } catch (err: any) {
        console.error('Errore nel caricamento coupon:', err)
        setError(err.message || 'Errore nel caricamento coupon')
      } finally {
        setLoadingCoupons(false)
      }
    }

    if (user?.id) {
      loadCoupons()
    }
  }, [user?.id])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/coupons/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          quantity,
          discountPercent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella generazione coupon')
      }

      setSuccess(`Coupon generati con successo! ${data.generated.length} coupon creati.`)
      setQuantity(1)
      
      // Ricarica lista coupon
      const couponsResponse = await fetch('/api/admin/coupons', {
        headers: {
          'x-user-id': user?.id || '',
        },
      })
      if (couponsResponse.ok) {
        const couponsData = await couponsResponse.json()
        setCoupons(couponsData.coupons || [])
      }
    } catch (err: any) {
      console.error('Errore nella generazione:', err)
      setError(err.message || 'Errore nella generazione coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setSuccess(`Codice ${code} copiato negli appunti!`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Errore nella copia del codice')
    }
  }

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo coupon?')) return

    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione coupon')
      }

      setSuccess('Coupon eliminato con successo!')
      setCoupons(coupons.filter(c => c.id !== couponId))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Errore nell\'eliminazione:', err)
      setError(err.message || 'Errore nell\'eliminazione coupon')
    }
  }

  if (loadingCoupons) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento...</p>
      </div>
    )
  }

  const unusedCoupons = coupons.filter(c => !c.isUsed)
  const usedCoupons = coupons.filter(c => c.isUsed)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FiGift className="mr-3" /> Generatore Coupon
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <FiAlertCircle className="inline mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <FiCheckCircle className="inline mr-2" />
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Generazione */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Genera Nuovi Coupon</h2>
            <form onSubmit={handleGenerate}>
              <div className="mb-6">
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Numero di Coupon da Generare
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Da 1 a 100 coupon</p>
              </div>

              <div className="mb-6">
                <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700 mb-2">
                  Percentuale Sconto (%)
                </label>
                <select
                  id="discountPercent"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  {discountOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}%
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiGift className="w-4 h-4" />
                <span>{saving ? 'Generazione...' : 'Genera Coupon'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Lista Coupon */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Coupon Disponibili</h2>
              <button
                onClick={async () => {
                  setLoadingCoupons(true)
                  try {
                    const response = await fetch('/api/admin/coupons', {
                      headers: {
                        'x-user-id': user?.id || '',
                      },
                    })
                    if (response.ok) {
                      const data = await response.json()
                      setCoupons(data.coupons || [])
                    }
                  } catch (err) {
                    console.error('Errore nel refresh:', err)
                  } finally {
                    setLoadingCoupons(false)
                  }
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>Aggiorna</span>
              </button>
            </div>

            {unusedCoupons.length === 0 && usedCoupons.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nessun coupon generato ancora.</p>
            ) : (
              <div className="space-y-4">
                {/* Coupon non utilizzati */}
                {unusedCoupons.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-3">
                      Non Utilizzati ({unusedCoupons.length})
                    </h3>
                    <div className="space-y-2">
                      {unusedCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <code className="text-lg font-bold text-green-800">{coupon.code}</code>
                              <span className="text-sm text-gray-600">- {coupon.discountPercent}% sconto</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Creato il {new Date(coupon.createdAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition"
                              title="Copia codice"
                            >
                              <FiCopy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                              title="Elimina coupon"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coupon utilizzati */}
                {usedCoupons.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">
                      Utilizzati ({usedCoupons.length})
                    </h3>
                    <div className="space-y-2">
                      {usedCoupons.slice(0, 10).map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-75"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <code className="text-lg font-bold text-gray-600">{coupon.code}</code>
                              <span className="text-sm text-gray-500">- {coupon.discountPercent}% sconto</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Utilizzato il {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString('it-IT') : 'N/A'}
                              {coupon.usedByOrderId && (
                                <span> - Ordine: {coupon.usedByOrderId.substring(0, 8)}...</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {usedCoupons.length > 10 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Mostrati i primi 10 di {usedCoupons.length} coupon utilizzati
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

