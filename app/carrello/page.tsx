'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import Image from 'next/image'
import Link from 'next/link'
import { FiTrash2, FiPlus, FiMinus, FiShoppingBag, FiCheckCircle } from 'react-icons/fi'
import ReservationCountdown from '@/components/cart/ReservationCountdown'

export default function CarrelloPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { items, removeItem, updateQuantity, getTotal, clearCart, loadCartFromDB, isLoading } = useCartStore()
  const [processing, setProcessing] = useState(false)
  // IMPORTANTE: Tutti gli hook devono essere dichiarati PRIMA di qualsiasi return condizionale
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null)
  const [loadingThreshold, setLoadingThreshold] = useState(true)

  // Carica carrello dal database quando l'utente è loggato
  useEffect(() => {
    if (isAuthenticated() && user?.id) {
      loadCartFromDB(user.id)
    }
  }, [user?.id, isAuthenticated, loadCartFromDB])

  // Ricarica periodicamente il carrello per rimuovere prenotazioni scadute
  // Controlla ogni 30 secondi se ci sono prenotazioni attive
  useEffect(() => {
    const hasActiveReservations = items.some(
      (item) => item.reservationExpiresAt && item.product.stockQuantity === 1
    )

    if (!hasActiveReservations || !user?.id) {
      return
    }

    // Controlla ogni 30 secondi se ci sono prenotazioni scadute
    const interval = setInterval(async () => {
      if (user?.id) {
        await loadCartFromDB(user.id)
      }
    }, 30000) // 30 secondi

    return () => clearInterval(interval)
  }, [items, user?.id, loadCartFromDB])

  // Carica soglia spedizione gratuita
  // IMPORTANTE: Questo deve funzionare per TUTTI gli utenti (admin e normali)
  useEffect(() => {
    async function loadFreeShippingThreshold() {
      try {
        setLoadingThreshold(true)
        const response = await fetch('/api/shipping/free-threshold', {
          cache: 'no-store', // Assicurati di avere sempre i dati più recenti
        })
        if (response.ok) {
          const data = await response.json()
          setFreeShippingThreshold(data.freeShippingThreshold || null)
          if (process.env.NODE_ENV === 'development') {
            console.log('Soglia spedizione gratuita caricata:', data.freeShippingThreshold)
          }
        } else {
          console.error('Errore nel caricamento soglia spedizione gratuita:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Errore nel caricamento soglia spedizione gratuita:', error)
      } finally {
        setLoadingThreshold(false)
      }
    }
    // Carica sempre, indipendentemente dall'utente
    loadFreeShippingThreshold()
  }, [])

  // Calcola valori dopo aver dichiarato tutti gli hook
  const total = getTotal()
  // Usa il prezzo salvato nell'item (con IVA e sconto) se presente, altrimenti calcola dal prodotto
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price !== undefined ? item.price : (item.product?.price || 0)
    return sum + itemPrice * item.quantity
  }, 0)

  // Calcola importo mancante per spedizione gratuita
  // IMPORTANTE: Il messaggio deve apparire per TUTTI gli utenti (admin e normali)
  const missingForFreeShipping = freeShippingThreshold && freeShippingThreshold > 0 && subtotal < freeShippingThreshold
    ? freeShippingThreshold - subtotal
    : null

  // Debug logging in file dedicato
  useEffect(() => {
    // Log solo quando ci sono items nel carrello e la soglia è stata caricata
    if (items.length > 0 && !loadingThreshold) {
      const shouldShowMessage = !loadingThreshold && missingForFreeShipping && missingForFreeShipping > 0
      
      // Invia log al server per scrivere nel file
      fetch('/api/logs/cart-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRole: user?.role || null,
          userId: user?.id || null,
          itemsCount: items.length,
          subtotal,
          freeShippingThreshold,
          missingForFreeShipping,
          loadingThreshold,
          shouldShowMessage,
          additionalInfo: {
            total,
            items: items.map(item => ({
              productId: item.product?.id,
              productName: item.product?.name,
              quantity: item.quantity,
              price: item.price !== undefined ? item.price : item.product?.price,
            })),
          },
        }),
      }).catch((error) => {
        // Ignora errori di logging per non interrompere l'esperienza utente
        console.error('Errore nel logging carrello:', error)
      })
    }
  }, [user?.role, user?.id, items.length, subtotal, freeShippingThreshold, missingForFreeShipping, loadingThreshold, total])

  // Verifica se ci sono prodotti con prenotazione scadente
  const itemsWithReservation = items.filter(
    (item) => item.reservationExpiresAt && item.product.stockQuantity === 1
  )
  const hasExpiredReservations = itemsWithReservation.some((item) => {
    if (!item.reservationExpiresAt) return false
    return new Date(item.reservationExpiresAt) < new Date()
  })

  // Ora possiamo fare i return condizionali DOPO aver dichiarato tutti gli hook
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Caricamento carrello...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <FiShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Il tuo carrello è vuoto</h1>
        <p className="text-gray-600 mb-8">Aggiungi alcuni prodotti per iniziare</p>
        <Link
          href="/catalogo"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
        >
          Sfoglia Catalogo
        </Link>
      </div>
    )
  }


  const handleCheckout = async () => {
    if (items.length === 0) return

    // Verifica che l'utente sia loggato
    if (!isAuthenticated() || !user) {
      router.push('/login?redirect=/checkout')
      return
    }

    // Reindirizza alla pagina checkout dove l'utente vedrà:
    // - Riepilogo ordine completo
    // - Spese di spedizione calcolate
    // - Corriere selezionato
    // - Tasto "Paga ora" per Stripe
    router.push('/checkout')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Il Tuo Carrello</h1>

      {/* Reminder spedizione gratuita */}
      {!loadingThreshold && missingForFreeShipping && missingForFreeShipping > 0 && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">
              Ti mancano <span className="font-bold">€{missingForFreeShipping.toFixed(2)}</span> per avere la spedizione gratuita!
            </p>
          </div>
        </div>
      )}

      {!loadingThreshold && freeShippingThreshold && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold && (
        <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <FiCheckCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
            <p className="text-green-900 font-semibold">
              🎉 Congratulazioni! Hai raggiunto la soglia per la spedizione gratuita!
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row gap-4"
              >
                <div className="relative w-full sm:w-32 h-32 bg-gray-200 rounded">
                  <Image
                    src={item.product.image || '/images/placeholder.svg'}
                    alt={item.product.name}
                    fill
                    className="object-cover rounded"
                    sizes="128px"
                  />
                </div>

                <div className="flex-1">
                  <Link
                    href={`/prodotto/${item.product.id}`}
                    className="text-xl font-semibold hover:text-primary-600 transition"
                  >
                    {item.product.name}
                  </Link>
                  {item.product.brand && (
                    <p className="text-gray-600 text-sm">Marca: {item.product.brand}</p>
                  )}
                    <p className="text-lg font-bold text-primary-600 mt-2">
                    €{(item.price !== undefined ? item.price : item.product.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Disponibili: {item.product.stockQuantity} pezzi
                  </p>
                  {item.product.stockQuantity === 1 && item.reservationExpiresAt && (
                    <div className="mt-2">
                      <ReservationCountdown
                        reservationExpiresAt={item.reservationExpiresAt}
                        onExpired={async () => {
                          // Ricarica il carrello quando la prenotazione scade
                          if (user?.id) {
                            await loadCartFromDB(user.id)
                          }
                        }}
                      />
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        ⚠️ Completa l'ordine entro 20 minuti o il prodotto verrà rimosso dal carrello
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between items-end">
                  <div className="flex items-center space-x-3 mb-4">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1, user?.id)}
                      className="p-1 border rounded hover:bg-gray-100"
                    >
                      <FiMinus className="w-4 h-4" />
                    </button>
                    <span className="font-semibold w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1, user?.id)}
                      className="p-1 border rounded hover:bg-gray-100"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold mb-2">
                      €{((item.price !== undefined ? item.price : item.product.price) * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.product.id, user?.id)}
                      className="text-red-600 hover:text-red-700 flex items-center space-x-1 text-sm"
                    >
                      <FiTrash2 />
                      <span>Rimuovi</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => clearCart(user?.id)}
            className="mt-6 text-red-600 hover:text-red-700 font-medium"
          >
            Svuota Carrello
          </button>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-4">Riepilogo Ordine</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotale ({items.reduce((sum, item) => sum + item.quantity, 0)} articoli)</span>
                <span>€{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Spedizione</span>
                <span>Da calcolare</span>
              </div>
              
              {/* Messaggio spedizione omaggio nel riepilogo */}
              {!loadingThreshold && missingForFreeShipping && missingForFreeShipping > 0 && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-800 font-medium">
                    Ti mancano <span className="font-bold text-green-900">€{missingForFreeShipping.toFixed(2)}</span> per avere la spedizione omaggio!
                  </p>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((subtotal / (freeShippingThreshold || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    {subtotal.toFixed(2)}€ / {freeShippingThreshold?.toFixed(2)}€
                  </p>
                </div>
              )}
              
              {!loadingThreshold && freeShippingThreshold && freeShippingThreshold > 0 && subtotal >= freeShippingThreshold && (
                <div className="bg-green-100 border border-green-400 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-900 font-semibold">
                    🎉 Spedizione omaggio attiva!
                  </p>
                </div>
              )}
              
              <div className="border-t pt-3 flex justify-between text-xl font-bold">
                <span>Totale</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition font-semibold text-lg mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <FiCheckCircle className="w-5 h-5" />
              <span>Procedi al Checkout</span>
            </button>
            {items.some(item => item.product.stockQuantity === 0) && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ⚠️ Alcuni prodotti nel carrello sono esauriti. Rimuovili prima di procedere.
                </p>
              </div>
            )}
            {hasExpiredReservations && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Alcune prenotazioni sono scadute. Il carrello verrà aggiornato automaticamente.
                </p>
              </div>
            )}
            {itemsWithReservation.length > 0 && !hasExpiredReservations && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Alcuni prodotti hanno una prenotazione temporanea. Completa l'ordine entro 20 minuti dalla loro aggiunta al carrello.
                </p>
              </div>
            )}

            <Link
              href="/catalogo"
              className="block text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              Continua gli Acquisti
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

