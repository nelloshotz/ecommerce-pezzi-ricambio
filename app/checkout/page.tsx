'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowLeft, FiCheckCircle, FiLock, FiCreditCard, FiAlertCircle, FiPackage, FiGift, FiX } from 'react-icons/fi'

interface Address {
  id: string
  type: 'SHIPPING' | 'BILLING'
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  province?: string | null
  country: string
  isDefault: boolean
}

// Componente form pagamento Stripe
function CheckoutForm({
  items,
  shippingAddress,
  billingAddress,
  shippingCalculation,
  onSuccess,
  appliedCoupon,
  onCouponChange,
}: {
  items: any[]
  shippingAddress: Address
  billingAddress: Address
  shippingCalculation: {
    carrier: string
    baseCost: number
    finalCost: number
    markupPercent: number
    message: string
    isFreeShipping?: boolean
    packages?: Array<{
      packageNumber: number
      items: Array<{ productId: string; productName?: string; quantity: number }>
      totalWeight: number
      dimensions: { height: number; width: number; depth: number; maxSide: number; sumOfSides: number; volume: number }
      cost: number
      carrier: string
      format?: string
    }>
    totalPackages?: number
  } | null
  onSuccess: (orderId: string) => void
  appliedCoupon?: {
    id: string
    code: string
    discountPercent: number
  } | null
  onCouponChange?: (coupon: { id: string; code: string; discountPercent: number } | null) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { user } = useAuthStore()
  const { clearCart } = useCartStore()

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [internalCoupon, setInternalCoupon] = useState<{
    id: string
    code: string
    discountPercent: number
  } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')
  
  // Usa il coupon passato come prop, altrimenti usa quello interno
  const currentCoupon = appliedCoupon !== undefined ? appliedCoupon : internalCoupon
  const setCoupon = onCouponChange || setInternalCoupon

  // Valida e applica coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Inserisci un codice coupon')
      return
    }

    setValidatingCoupon(true)
    setCouponError('')

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: couponCode.toUpperCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Coupon non valido o scaduto')
      }

      setCoupon(data.coupon)
      setCouponCode('')
      
      // Ricrea payment intent con il coupon applicato
      if (clientSecret) {
        await createPaymentIntentWithCoupon(data.coupon)
      }
    } catch (err: any) {
      console.error('Errore nella validazione coupon:', err)
      setCouponError(err.message || 'Coupon non valido o scaduto')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCoupon(null)
    setCouponError('')
    // Ricrea payment intent senza coupon
    if (clientSecret) {
      createPaymentIntent()
    }
  }

  // Funzione per creare payment intent con coupon
  const createPaymentIntentWithCoupon = async (coupon: { id: string; code: string; discountPercent: number }) => {
    if (!user?.id || items.length === 0 || !shippingCalculation) return

    try {
      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      const discountAmount = (subtotal * coupon.discountPercent) / 100
      const subtotalAfterDiscount = subtotal - discountAmount
      const shippingCost = shippingCalculation.isFreeShipping ? 0 : shippingCalculation.finalCost
      const tax = 0
      const total = subtotalAfterDiscount + shippingCost + tax

      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          amount: Math.round(total * 100),
          currency: 'eur',
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Errore nella creazione pagamento')
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
    } catch (error: any) {
      console.error('Errore nella creazione payment intent:', error)
      setError(error.message || 'Errore nella creazione pagamento')
    }
  }

  // Crea payment intent quando il componente è montato
  const createPaymentIntent = async () => {
    if (!user?.id || items.length === 0 || !shippingCalculation) return

    try {
      // Calcola totale con spedizione calcolata
      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      const discountAmount = currentCoupon ? (subtotal * currentCoupon.discountPercent) / 100 : 0
      const subtotalAfterDiscount = subtotal - discountAmount
      const shippingCost = shippingCalculation.isFreeShipping ? 0 : shippingCalculation.finalCost
      const tax = 0
      const total = subtotalAfterDiscount + shippingCost + tax

        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            amount: Math.round(total * 100), // Stripe usa centesimi
            currency: 'eur',
            items: items.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
            shippingAddressId: shippingAddress.id,
            billingAddressId: billingAddress.id,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Errore nella creazione pagamento')
        }

      const data = await response.json()
      setClientSecret(data.clientSecret)
    } catch (error: any) {
      console.error('Errore nella creazione payment intent:', error)
      setError(error.message || 'Errore nella creazione pagamento')
    }
  }

  useEffect(() => {
    if (shippingCalculation && !currentCoupon) {
      createPaymentIntent()
    }
  }, [user?.id, items, shippingAddress.id, billingAddress.id, shippingCalculation, currentCoupon])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setProcessing(true)
    setError('')

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Elemento carta non trovato')
      }

      // Conferma pagamento con Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${billingAddress.firstName} ${billingAddress.lastName}`,
              email: billingAddress.email,
              phone: billingAddress.phone,
              address: {
                line1: billingAddress.address,
                city: billingAddress.city,
                postal_code: billingAddress.postalCode,
                country: 'IT',
              },
            },
          },
        }
      )

      if (stripeError) {
        throw new Error(stripeError.message || 'Errore nel pagamento')
      }

      if (paymentIntent?.status === 'succeeded') {
        if (!shippingCalculation) {
          throw new Error('Dati spedizione mancanti')
        }

        // Pagamento completato, crea ordine
        const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
        const discountAmount = currentCoupon ? (subtotal * currentCoupon.discountPercent) / 100 : 0
        const discountPercent = currentCoupon ? currentCoupon.discountPercent : null
        const subtotalAfterDiscount = subtotal - discountAmount
        const shippingCost = shippingCalculation.isFreeShipping ? 0 : shippingCalculation.finalCost
        const tax = 0
        const total = subtotalAfterDiscount + shippingCost + tax

        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.id || '',
          },
          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              product: {
                name: item.product.name,
              },
            })),
            shippingAddressId: shippingAddress.id,
            billingAddressId: billingAddress.id,
            paymentMethod: 'Carta di Credito (Stripe)',
            paymentStatus: 'PAID',
            stripePaymentIntentId: paymentIntent.id,
            subtotal,
            discountAmount,
            discountPercent,
            couponCode: currentCoupon?.code || null,
            couponId: currentCoupon?.id || null,
            shippingCost,
            shippingCarrier: shippingCalculation.carrier,
            shippingBaseCost: shippingCalculation.baseCost,
            shippingMarkupPercent: shippingCalculation.markupPercent,
            shippingPackages: shippingCalculation.packages ? JSON.stringify(shippingCalculation.packages) : null,
            isFreeShipping: shippingCalculation.isFreeShipping || false,
            tax,
            total,
          }),
        })

        if (!orderResponse.ok) {
          const data = await orderResponse.json()
          throw new Error(data.error || 'Errore nella creazione ordine')
        }

        const orderData = await orderResponse.json()
        
        // Svuota carrello
        if (user?.id) {
          await clearCart(user.id)
        }

        // Reindirizza alla pagina ordine
        onSuccess(orderData.order.id)
      } else {
        throw new Error('Pagamento non completato')
      }
    } catch (error: any) {
      console.error('Errore nel pagamento:', error)
      setError(error.message || 'Errore durante il pagamento. Riprova.')
    } finally {
      setProcessing(false)
    }
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          {!shippingCalculation ? 'Calcolo spedizione in corso...' : 'Preparazione pagamento...'}
        </p>
      </div>
    )
  }

  // Calcola totali per il riepilogo
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discountAmount = currentCoupon ? (subtotal * currentCoupon.discountPercent) / 100 : 0
  const subtotalAfterDiscount = subtotal - discountAmount
  const shippingCost = shippingCalculation?.isFreeShipping ? 0 : (shippingCalculation?.finalCost || 0)
  const tax = 0
  const total = subtotalAfterDiscount + shippingCost + tax

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo Coupon */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FiGift className="w-5 h-5 mr-2" />
          Codice Coupon
        </h2>
        {currentCoupon ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900">
                  Coupon applicato: <code className="font-bold">{currentCoupon.code}</code>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Sconto del {currentCoupon.discountPercent}% applicato (€{discountAmount.toFixed(2)})
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="p-2 text-green-700 hover:text-green-900 hover:bg-green-100 rounded transition"
                title="Rimuovi coupon"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex space-x-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase())
                setCouponError('')
              }}
              placeholder="Inserisci codice coupon"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={validatingCoupon || !couponCode.trim()}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {validatingCoupon ? 'Validazione...' : 'Applica'}
            </button>
          </div>
        )}
        {couponError && (
          <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
            <FiAlertCircle className="w-4 h-4" />
            <span>{couponError}</span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FiCreditCard className="w-5 h-5 mr-2" />
          Dati Carta di Credito
        </h2>

        <div className="border rounded-lg p-4 bg-gray-50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-2 flex items-center">
          <FiLock className="w-3 h-3 mr-1" />
          I tuoi dati sono protetti e criptati. Non salviamo i dati della carta.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start space-x-2">
          <FiAlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Errore</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing || !clientSecret}
        className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-semibold text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
      >
        {processing ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Elaborazione pagamento...</span>
          </>
        ) : (
          <>
            <FiLock className="w-6 h-6" />
            <span>Paga Ora - €{total.toFixed(2)}</span>
          </>
        )}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { items, getTotal, loadCartFromDB } = useCartStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null)
  const [billingAddress, setBillingAddress] = useState<Address | null>(null)
  const [shippingCalculation, setShippingCalculation] = useState<{
    carrier: string
    baseCost: number
    finalCost: number
    markupPercent: number
    message: string
    packages?: Array<{
      packageNumber: number
      items: Array<{ productId: string; productName?: string; quantity: number }>
      totalWeight: number
      dimensions: { height: number; width: number; depth: number; maxSide: number; sumOfSides: number; volume: number }
      cost: number
      carrier: string
      format?: string
    }>
    totalPackages?: number
  } | null>(null)
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    code: string
    discountPercent: number
  } | null>(null)

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push('/login?redirect=/checkout')
      return
    }

    loadData()
  }, [user, isAuthenticated, router])

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Verifica se l'utente è bannato (verifica verrà fatta anche nella creazione ordine)
      // Per ora lasciamo che il checkout proceda, la verifica finale sarà nella creazione ordine

      // Carica carrello dal database
      await loadCartFromDB(user.id)

      // Carica indirizzi
      const addressesResponse = await fetch(`/api/users/${user.id}/addresses`)
      if (addressesResponse.ok) {
        const data = await addressesResponse.json()
        setAddresses(data.addresses || [])

        // Trova indirizzi default
        const shipping = data.addresses.find(
          (a: Address) => a.type === 'SHIPPING' && a.isDefault
        )
        const billing = data.addresses.find(
          (a: Address) => a.type === 'BILLING' && a.isDefault
        )

        setShippingAddress(shipping || null)
        setBillingAddress(billing || null)
      }

      // Carica configurazione Stripe per ottenere publishable key
      const stripeConfigResponse = await fetch('/api/admin/stripe/config')
      if (stripeConfigResponse.ok) {
        const stripeData = await stripeConfigResponse.json()
        if (stripeData.config?.publishableKey && stripeData.config?.isActive) {
          setStripePromise(loadStripe(stripeData.config.publishableKey))
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
      alert('Errore nel caricamento dati checkout')
    } finally {
      setLoading(false)
    }
  }

  const calculateShippingCost = async () => {
    if (!user?.id || items.length === 0) return

    try {
      setCalculatingShipping(true)

      const response = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel calcolo spedizione')
      }

      const data = await response.json()
      setShippingCalculation(data)
    } catch (error: any) {
      console.error('Errore nel calcolo spedizione:', error)
      // In caso di errore, usa un valore di default
      setShippingCalculation({
        carrier: 'Poste Italiane',
        baseCost: 18.30,
        finalCost: 18.30,
        markupPercent: 0,
        message: 'Spedito con Poste Italiane',
      })
    } finally {
      setCalculatingShipping(false)
    }
  }

  // Ricalcola spedizione quando cambia il carrello
  useEffect(() => {
    if (items.length > 0 && user?.id) {
      calculateShippingCost()
    } else {
      setShippingCalculation(null)
    }
  }, [items.length, user?.id])

  const handleOrderSuccess = (orderId: string) => {
    alert('Ordine completato con successo!')
    router.push(`/ordini/${orderId}`)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento checkout...</p>
      </div>
    )
  }

  if (!isAuthenticated() || !user) {
    return null
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-xl text-gray-600 mb-4">Il tuo carrello è vuoto</p>
        <Link
          href="/catalogo"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
        >
          Continua gli Acquisti
        </Link>
      </div>
    )
  }

  if (!shippingAddress || !billingAddress) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-xl text-gray-600 mb-4">
          Configura gli indirizzi di spedizione e fatturazione prima di procedere
        </p>
        <Link
          href="/profilo"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
        >
          Vai al Profilo
        </Link>
      </div>
    )
  }

  if (!stripePromise) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <FiAlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            Pagamenti non configurati
          </h2>
          <p className="text-yellow-800 mb-4">
            Stripe non è ancora configurato. Contatta l'amministratore.
          </p>
          <p className="text-sm text-yellow-700">
            Per completare l'ordine, l'amministratore deve configurare Stripe nella sezione Admin.
          </p>
        </div>
      </div>
    )
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0
  const subtotalAfterDiscount = subtotal - discountAmount
  const shippingCost = shippingCalculation?.isFreeShipping ? 0 : (shippingCalculation?.finalCost || 0)
  const tax = 0
  const total = subtotalAfterDiscount + shippingCost + tax

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/carrello"
          className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span>Torna al Carrello</span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Riepilogo Ordine</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Pagamento e Dettagli */}
        <div className="lg:col-span-2 space-y-6">
          {/* Riepilogo Prodotti */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Riepilogo Ordine</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center space-x-4 border-b pb-4">
                  <div className="relative w-20 h-20 bg-gray-200 rounded">
                    <Image
                      src={item.product.image || '/images/placeholder.svg'}
                      alt={item.product.name}
                      fill
                      className="object-cover rounded"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">
                      Quantità: {item.quantity} × €{item.product.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    €{(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Info Spedizione */}
          {shippingCalculation && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiPackage className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-primary-900">
                  {shippingCalculation.totalPackages && shippingCalculation.totalPackages > 1
                    ? `${shippingCalculation.totalPackages} Colli - Spedito con ${shippingCalculation.carrier}`
                    : `Spedizione con ${shippingCalculation.carrier}`}
                </h3>
              </div>
              <p className="text-sm text-primary-800 mb-2">
                {shippingCalculation.message}
              </p>
              {shippingCalculation.markupPercent > 0 && (
                <p className="text-xs text-primary-700 mb-2">
                  Costo base: €{shippingCalculation.baseCost.toFixed(2)} + {shippingCalculation.markupPercent}% ricarico = €{shippingCalculation.finalCost.toFixed(2)}
                </p>
              )}
              {/* Dettagli Colli */}
              {shippingCalculation.packages && shippingCalculation.packages.length > 1 && (
                <div className="mt-3 pt-3 border-t border-primary-300">
                  <p className="text-xs font-medium text-primary-900 mb-2">Dettaglio Colli:</p>
                  <div className="space-y-2">
                    {shippingCalculation.packages.map((pkg) => (
                      <div key={pkg.packageNumber} className="bg-white rounded p-2 text-xs">
                        <p className="font-medium text-primary-800">
                          Collo {pkg.packageNumber}: {pkg.items.length} {pkg.items.length === 1 ? 'prodotto' : 'prodotti'} - €{pkg.cost.toFixed(2)}
                        </p>
                        <p className="text-primary-700 mt-1">
                          {pkg.items.map((item, idx) => (
                            <span key={idx}>
                              {item.productName} (x{item.quantity})
                              {idx < pkg.items.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                        <p className="text-primary-600 mt-1">
                          Peso: {pkg.totalWeight.toFixed(2)} kg | Dimensioni: {pkg.dimensions.height}×{pkg.dimensions.width}×{pkg.dimensions.depth} cm
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Indirizzo Spedizione */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Indirizzo di Spedizione</h2>
            <div className="text-gray-700">
              <p className="font-medium">
                {shippingAddress.firstName} {shippingAddress.lastName}
              </p>
              <p>{shippingAddress.address}</p>
              <p>
                {shippingAddress.postalCode} {shippingAddress.city}
                {shippingAddress.province && ` (${shippingAddress.province})`}
              </p>
              <p>{shippingAddress.country}</p>
              <p className="mt-2 text-sm">
                📧 {shippingAddress.email} | 📞 {shippingAddress.phone}
              </p>
            </div>
            <Link
              href="/profilo"
              className="inline-block mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Modifica indirizzo
            </Link>
          </div>

          {/* Indirizzo Fatturazione */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Indirizzo di Fatturazione</h2>
            <div className="text-gray-700">
              <p className="font-medium">
                {billingAddress.firstName} {billingAddress.lastName}
              </p>
              <p>{billingAddress.address}</p>
              <p>
                {billingAddress.postalCode} {billingAddress.city}
                {billingAddress.province && ` (${billingAddress.province})`}
              </p>
              <p>{billingAddress.country}</p>
              <p className="mt-2 text-sm">
                📧 {billingAddress.email} | 📞 {billingAddress.phone}
              </p>
            </div>
            <Link
              href="/profilo"
              className="inline-block mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Modifica indirizzo
            </Link>
          </div>

          {/* Form Pagamento */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <Elements stripe={stripePromise}>
              <CheckoutForm
                items={items}
                shippingAddress={shippingAddress}
                billingAddress={billingAddress}
                shippingCalculation={shippingCalculation}
                onSuccess={handleOrderSuccess}
                appliedCoupon={appliedCoupon}
                onCouponChange={setAppliedCoupon}
              />
            </Elements>
          </div>
        </div>

        {/* Sidebar Riepilogo Costi */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-xl font-semibold mb-4">Riepilogo Costi</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Subtotale ({items.reduce((sum, item) => sum + item.quantity, 0)} articoli)</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
              </div>
              {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded">
                  <div className="flex items-center space-x-2">
                    <FiGift className="w-4 h-4" />
                    <span className="text-sm font-medium">Sconto ({appliedCoupon.code})</span>
                  </div>
                  <span className="font-semibold">-€{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between items-start text-gray-700 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">Spedizione</span>
                      {shippingCalculation && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          <FiPackage className="w-3 h-3 mr-1" />
                          {shippingCalculation.carrier}
                        </span>
                      )}
                    </div>
                    {shippingCalculation && shippingCalculation.markupPercent > 0 && (
                      <p className="text-xs text-gray-500">
                        Base: €{shippingCalculation.baseCost.toFixed(2)} + {shippingCalculation.markupPercent}% ricarico
                      </p>
                    )}
                    {shippingCalculation?.isFreeShipping && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        🎉 Spedizione Gratuita!
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-lg">
                    {calculatingShipping ? (
                      <span className="text-sm text-gray-400">Calcolo...</span>
                    ) : shippingCalculation?.isFreeShipping ? (
                      <span className="text-green-600">Gratis</span>
                    ) : (
                      `€${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>IVA</span>
                <span className="font-medium">€{tax.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-primary-600 pt-4 flex justify-between text-2xl font-bold text-primary-600">
                <span>Totale</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-center space-x-2 text-green-800 mb-2">
                <FiCheckCircle className="w-5 h-5" />
                <span className="font-medium">Pagamento Sicuro con Stripe</span>
              </div>
              <p className="text-xs text-green-700">
                I tuoi dati sono protetti e criptati. Questo sito utilizza Stripe per processare i pagamenti in modo sicuro.
              </p>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Cliccando "Paga Ora" verrai reindirizzato al pagamento sicuro con Stripe
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

