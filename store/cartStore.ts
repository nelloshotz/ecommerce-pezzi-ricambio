import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  isLoading: boolean
  addItem: (product: Product, quantity?: number, userId?: string) => Promise<void>
  removeItem: (productId: string, userId?: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number, userId?: string) => Promise<void>
  clearCart: (userId?: string) => Promise<void>
  syncCartFromDB: (userId: string) => Promise<void>
  loadCartFromDB: (userId: string) => Promise<void>
  getTotal: () => number
  getItemCount: () => number
}

// Funzione helper per ottenere header con autenticazione JWT
const getAuthHeaders = async () => {
  const { getAuthHeaders: getHeaders } = await import('@/lib/apiClient')
  return {
    'Content-Type': 'application/json',
    ...getHeaders(),
  }
}

// Funzione helper per sincronizzare con database
const syncWithDB = async (userId: string, items: CartItem[]) => {
  try {
    const headers = await getAuthHeaders()
    // Sincronizza ogni item con il database
    for (const item of items) {
      await fetch('/api/cart', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: item.product.id,
          quantity: item.quantity,
        }),
      })
    }
  } catch (error) {
    console.error('Errore sincronizzazione carrello:', error)
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      
      // Carica carrello dal database
      // IMPORTANTE: Il carrello rimane nel database anche dopo il logout
      // Quando l'utente fa login di nuovo, questa funzione ricarica il carrello dal database
      // IMPORTANTE: Ogni utente vede solo il proprio carrello salvato nel database
      // Quando si cambia utente, il carrello del precedente utente viene completamente rimosso
      // e viene caricato il carrello del nuovo utente dal database
      loadCartFromDB: async (userId: string) => {
        set({ isLoading: true })
        try {
          // PRIMA: Rimuovi completamente il localStorage PRIMA di qualsiasi operazione
          // Questo è fondamentale quando si cambia utente: evita che il persist middleware
          // ri-idrati il carrello del precedente utente quando lo store viene aggiornato
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cart-storage')
            // Attendi un breve momento per assicurarsi che il localStorage sia stato rimosso
            // e che il persist middleware non interferisca
            await new Promise(resolve => setTimeout(resolve, 10))
          }
          
          // POI: Pulisci completamente il carrello locale per evitare conflitti
          // Questo è fondamentale quando si cambia utente: evita di mostrare 
          // prodotti del carrello del precedente utente durante il caricamento
          set({ items: [] })
          
          // INFINE: Carica il carrello dal database (specifico per questo userId)
          // Il database è la fonte di verità per ogni utente
          const { getAuthHeaders } = await import('@/lib/apiClient')
          const response = await fetch('/api/cart', {
            headers: getAuthHeaders(),
            cache: 'no-store', // Non usare cache per avere sempre dati aggiornati
          })

          if (response.ok) {
            const data = await response.json()
            // Converti CartItem del DB al formato CartItem dello store
            // IMPORTANTE: Assicuriamoci che il prodotto abbia tutti i campi necessari
            const items: CartItem[] = (data.items || []).map((item: any) => {
              const product = item.product
              // Normalizza il prodotto per assicurarsi che abbia tutti i campi necessari
              const normalizedProduct: Product = {
                id: product.id,
                name: product.name || '',
                description: product.description || '',
                price: product.price || 0,
                image: product.image || '/images/placeholder.svg',
                category: product.category?.name || product.category || '',
                productType: product.productType?.slug || undefined,
                customFields: product.customFields ? (typeof product.customFields === 'string' ? JSON.parse(product.customFields) : product.customFields) : {},
                brand: product.brand || undefined,
                partNumber: product.partNumber || undefined,
                compatibility: product.compatibility || undefined,
                sku: product.sku || undefined,
                inStock: product.inStock !== undefined ? product.inStock : true,
                stockQuantity: product.stockQuantity !== undefined ? product.stockQuantity : 0,
                reservedQuantity: product.reservedQuantity || undefined,
                active: product.active !== undefined ? product.active : true,
                featured: product.featured || false,
                createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
                updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(),
              }
              
              // Log per debug
              try {
                fetch('/api/logs/error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    component: 'CartStore - loadCartFromDB',
                    message: 'Caricamento item dal DB',
                    additionalInfo: {
                      productId: item.productId,
                      itemPrice: item.price,
                      productPrice: product.price,
                      finalPrice: item.price || undefined,
                    },
                  }),
                }).catch(() => {})
              } catch (logError) {
                // Ignora errori di logging
              }
              
              return {
                id: item.id,
                productId: item.productId,
                product: normalizedProduct,
                quantity: item.quantity || 1,
                price: item.price !== null && item.price !== undefined ? item.price : undefined, // Prezzo effettivo pagato (mantieni anche se 0)
                reservationExpiresAt: item.reservationExpiresAt ? new Date(item.reservationExpiresAt) : null,
              }
            })
            // Imposta il carrello caricato dal database
            // Il persist middleware salverà automaticamente nel localStorage
            // IMPORTANTE: Il localStorage ora contiene il carrello corretto per questo utente specifico
            // Quando si cambia utente, questo localStorage viene pulito e viene salvato quello nuovo
            set({ items })
          } else {
            // Se l'API restituisce un errore, mantieni il carrello vuoto
            set({ items: [] })
            // Rimuovi anche il localStorage in caso di errore
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cart-storage')
            }
          }
        } catch (error) {
          console.error('Errore caricamento carrello:', error)
          // In caso di errore, mantieni il carrello vuoto
          set({ items: [] })
          // Rimuovi anche il localStorage in caso di errore
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cart-storage')
          }
        } finally {
          set({ isLoading: false })
        }
      },

      // Sincronizza carrello locale con database
      syncCartFromDB: async (userId: string) => {
        const items = get().items
        await syncWithDB(userId, items)
        // Ricarica dal database per avere dati aggiornati
        await get().loadCartFromDB(userId)
      },

      addItem: async (product: Product, quantity = 1, userId?: string) => {
        try {
          // Validazione input
          if (!product || !product.id) {
            alert('Prodotto non valido')
            return
          }

          // Controlla se il prodotto è disponibile
          if (product.inStock === false || !product.stockQuantity || product.stockQuantity <= 0) {
            alert('Prodotto non disponibile')
            return
          }

          // Validazione quantità
          if (!quantity || quantity <= 0) {
            alert('Quantità non valida')
            return
          }

          // Calcola il prezzo effettivo (con IVA e sconto se presente)
          let finalPrice = product.price || 0
          const basePrice = finalPrice
          
          // Log prezzo iniziale
          try {
            await fetch('/api/logs/error', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                component: 'CartStore - addItem',
                message: 'Calcolo prezzo - Inizio',
                additionalInfo: {
                  productId: product.id,
                  basePrice: product.price,
                  vatRate: (product as any).vatRate,
                },
              }),
            })
          } catch (logError) {
            // Ignora errori di logging
          }
          
          // Applica IVA se presente
          if ((product as any).vatRate && (product as any).vatRate > 0) {
            finalPrice = product.price * (1 + (product as any).vatRate / 100)
            
            // Log dopo IVA
            try {
              await fetch('/api/logs/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  component: 'CartStore - addItem',
                  message: 'Calcolo prezzo - Dopo IVA',
                  additionalInfo: {
                    productId: product.id,
                    basePrice,
                    vatRate: (product as any).vatRate,
                    priceWithVat: finalPrice,
                  },
                }),
              })
            } catch (logError) {
              // Ignora errori di logging
            }
          }

          // Controlla se c'è un'offerta attiva
          let offerApplied = false
          try {
            const offerResponse = await fetch(`/api/products/${product.id}/active-offer`, {
              cache: 'no-store',
            })
            if (offerResponse.ok) {
              const offerData = await offerResponse.json()
              if (offerData && offerData.offer && offerData.offer.discountPercent && offerData.offer.discountPercent > 0) {
                const priceBeforeDiscount = finalPrice
                // Applica sconto al prezzo (già comprensivo di IVA se presente)
                finalPrice = finalPrice * (1 - offerData.offer.discountPercent / 100)
                offerApplied = true
                
                // Log dopo sconto
                try {
                  await fetch('/api/logs/error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      component: 'CartStore - addItem',
                      message: 'Calcolo prezzo - Dopo sconto',
                      additionalInfo: {
                        productId: product.id,
                        basePrice,
                        priceWithVat: priceBeforeDiscount,
                        discountPercent: offerData.offer.discountPercent,
                        finalPrice,
                      },
                    }),
                  })
                } catch (logError) {
                  // Ignora errori di logging
                }
              }
            }
          } catch (error) {
            console.error('Errore nel caricamento offerta (continua senza sconto):', error)
            // Continua senza sconto se c'è un errore - non bloccare l'aggiunta al carrello
          }

          // Arrotonda il prezzo a 2 decimali per evitare problemi di precisione
          finalPrice = Math.round(finalPrice * 100) / 100
          
          // Log prezzo finale
          try {
            await fetch('/api/logs/error', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                component: 'CartStore - addItem',
                message: 'Calcolo prezzo - Finale',
                additionalInfo: {
                  productId: product.id,
                  basePrice,
                  vatRate: (product as any).vatRate,
                  offerApplied,
                  finalPrice,
                  finalPriceRounded: finalPrice,
                },
              }),
            })
          } catch (logError) {
            // Ignora errori di logging
          }

          // Assicurati che finalPrice sia un numero valido
          if (isNaN(finalPrice) || finalPrice <= 0) {
            console.error('Prezzo non valido calcolato:', { productPrice: product.price, vatRate: (product as any).vatRate, finalPrice })
            alert('Errore nel calcolo del prezzo. Riprova.')
            return
          }

          const items = get().items
          const existingItem = items.find(item => item.product.id === product.id)
          const currentQuantity = existingItem ? existingItem.quantity : 0
          const totalQuantity = currentQuantity + quantity

          // Controlla se la quantità totale richiesta è disponibile
          if (totalQuantity > product.stockQuantity) {
            alert(`Quantità non disponibile. Disponibili solo ${product.stockQuantity} pezzi.`)
            return
          }

          // Aggiorna stato locale
          let newItems: CartItem[]
          if (existingItem) {
            newItems = items.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: totalQuantity, price: finalPrice }
                : item
            )
          } else {
            newItems = [...items, { product, quantity: totalQuantity, price: finalPrice }]
          }
          set({ items: newItems })

          // Se utente loggato, sincronizza con database (passa quantità finale e prezzo)
          if (userId) {
            try {
              const requestBody = {
                productId: product.id,
                quantity: totalQuantity, // Quantità finale desiderata
                price: finalPrice, // Prezzo effettivo pagato
              }
              
              // Log nel file
              try {
                await fetch('/api/logs/error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    component: 'CartStore - addItem',
                    message: 'Aggiunta al carrello - Request',
                    additionalInfo: requestBody,
                  }),
                })
              } catch (logError) {
                // Ignora errori di logging
              }
              
              const headers = await getAuthHeaders()
              const response = await fetch('/api/cart', {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
              })

            if (!response.ok) {
              let errorMessage = 'Errore nell\'aggiunta al carrello'
              try {
                const data = await response.json()
                errorMessage = data.error || errorMessage
              } catch (e) {
                // Se la risposta non è JSON, usa il messaggio di default
                errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`
              }
              console.error('Errore aggiunta al carrello:', errorMessage)
              alert(errorMessage)
              // Ripristina stato precedente in caso di errore
              set({ items })
              return
            }

            // Se tutto va bene, ricarica il carrello dal database per avere dati aggiornati
            // Questo garantisce che il carrello sia sincronizzato con il database
            // e che i prodotti abbiano tutti i campi corretti
            try {
              await get().loadCartFromDB(userId)
            } catch (error) {
              console.error('Errore nel ricaricamento carrello dopo aggiunta:', error)
              // Non bloccare l'operazione se il ricaricamento fallisce
              // Il carrello locale è già stato aggiornato
            }
            } catch (error: any) {
              console.error('Errore sincronizzazione carrello:', error)
              const errorMessage = error?.message || 'Errore nel salvataggio del carrello. Riprova.'
              alert(errorMessage)
              // Ripristina stato precedente
              set({ items })
              return
            }
          }
        } catch (error: any) {
          console.error('Errore nell\'aggiunta al carrello:', error)
          alert(error?.message || 'Errore nell\'aggiunta al carrello. Riprova.')
        }
      },

      removeItem: async (productId: string, userId?: string) => {
        const items = get().items.filter(item => item.product.id !== productId)
        set({ items })

        // Se utente loggato, sincronizza con database
        if (userId) {
          try {
            const headers = await getAuthHeaders()
            await fetch(`/api/cart?productId=${productId}`, {
              method: 'DELETE',
              headers,
            })
          } catch (error) {
            console.error('Errore rimozione carrello:', error)
          }
        }
      },

      updateQuantity: async (productId: string, quantity: number, userId?: string) => {
        if (quantity <= 0) {
          await get().removeItem(productId, userId)
          return
        }

        const items = get().items
        const item = items.find(i => i.product.id === productId)
        
        if (!item) return

        // Controlla se la quantità richiesta è disponibile
        if (quantity > item.product.stockQuantity) {
          alert(`Quantità non disponibile. Disponibili solo ${item.product.stockQuantity} pezzi.`)
          return
        }

        const newItems = items.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
        set({ items: newItems })

        // Se utente loggato, sincronizza con database
        if (userId) {
          try {
            const headers = await getAuthHeaders()
            const response = await fetch('/api/cart', {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                productId,
                quantity,
                price: item.price, // Mantieni il prezzo esistente (con IVA e sconto)
              }),
            })

            if (!response.ok) {
              const data = await response.json()
              alert(data.error || 'Errore nell\'aggiornamento del carrello')
              // Ripristina stato precedente
              set({ items })
            }
          } catch (error) {
            console.error('Errore aggiornamento carrello:', error)
            alert('Errore nel salvataggio del carrello. Riprova.')
            // Ripristina stato precedente
            set({ items })
          }
        }
      },

      clearCart: async (userId?: string) => {
        const items = get().items
        set({ items: [] })

        // Se userId è fornito, rimuovi tutti gli item dal database
        // NOTA: Se userId NON è fornito (come quando si fa logout), 
        // pulisce solo lo stato locale, mantenendo il carrello nel database
        // così quando l'utente fa login di nuovo, il carrello viene ricaricato
        if (userId) {
          try {
            // Carica items dal DB e rimuovili uno per uno
            const headers = await getAuthHeaders()
            const response = await fetch('/api/cart', {
              headers,
            })
            if (response.ok) {
              const data = await response.json()
              for (const item of data.items || []) {
                await fetch(`/api/cart?productId=${item.productId}`, {
                  method: 'DELETE',
                  headers,
                })
              }
            }
          } catch (error) {
            console.error('Errore svuotamento carrello:', error)
            // Ripristina items in caso di errore
            set({ items })
          }
        }
        // Se userId NON è fornito, pulisce solo lo stato locale (per logout)
        // Il carrello rimane nel database e verrà ricaricato al prossimo login
      },

      getTotal: () => {
        return get().items.reduce(
          (total, item) => {
            // Usa il prezzo salvato nell'item se presente, altrimenti calcola dal prodotto
            const itemPrice = item.price !== undefined ? item.price : item.product.price
            return total + itemPrice * item.quantity
          },
          0
        )
      },
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }),
    }
  )
)

