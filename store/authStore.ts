import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@/types'

interface AuthStore {
  user: User | null
  loginTimestamp: number | null // Timestamp del login (per logout automatico a mezzanotte)
  login: (email: string, password: string, userData?: User) => Promise<boolean>
  logout: () => Promise<void>
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loginTimestamp: null,
      login: async (email: string, password: string, userData?: User) => {
        // Funzione helper per pulire completamente il carrello locale
        const clearCartLocal = async () => {
          if (typeof window !== 'undefined') {
            // Rimuovi il localStorage del carrello per evitare che venga ri-idratato
            localStorage.removeItem('cart-storage')
            // Pulisci anche lo stato del carrello locale immediatamente
            try {
              const { useCartStore } = await import('@/store/cartStore')
              // Pulisci lo stato del carrello prima di caricare quello nuovo
              useCartStore.setState({ items: [] })
              // Forza anche la rimozione dal persist middleware
              // Il persist middleware potrebbe avere un delay, quindi rimuoviamo manualmente
              const storageKey = 'cart-storage'
              if (localStorage.getItem(storageKey)) {
                localStorage.removeItem(storageKey)
              }
            } catch (error) {
              console.error('Errore pulizia carrello locale:', error)
            }
          }
        }

        // Funzione helper per caricare il carrello dal database
        const loadCartForUser = async (userId: string) => {
          if (typeof window !== 'undefined' && userId) {
            try {
              const { useCartStore } = await import('@/store/cartStore')
              const cartStore = useCartStore.getState()
              // Carica il carrello dal database (specifico per questo utente)
              await cartStore.loadCartFromDB(userId)
            } catch (error) {
              console.error('Errore caricamento carrello dopo login:', error)
            }
          }
        }

        // Se userData è fornito (da API), usalo direttamente
        if (userData) {
          // PRIMA: Pulisci completamente il carrello locale del precedente utente
          await clearCartLocal()
          
          // POI: Salva i dati del nuovo utente (questo triggererà il reload delle pagine)
          const loginTime = Date.now()
          set({ user: userData, loginTimestamp: loginTime })
          
          // INFINE: Carica il carrello del nuovo utente dal database
          // Usa un piccolo delay per garantire che lo store sia aggiornato
          setTimeout(() => {
            loadCartForUser(userData.id)
          }, 50)
          
          return true
        }

        // Altrimenti fallback a chiamata API (per retrocompatibilità)
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })

          const data = await response.json()

          if (response.ok && data.user) {
            // PRIMA: Pulisci completamente il carrello locale del precedente utente
            await clearCartLocal()
            
            // POI: Salva i dati del nuovo utente (questo triggererà il reload delle pagine)
            const loginTime = Date.now()
            set({ user: data.user, loginTimestamp: loginTime })
            
            // INFINE: Carica il carrello del nuovo utente dal database
            // Usa un piccolo delay per garantire che lo store sia aggiornato
            setTimeout(() => {
              loadCartForUser(data.user.id)
            }, 50)
            
            return true
          }
          return false
        } catch (error) {
          console.error('Errore login:', error)
          return false
        }
      },
      logout: async () => {
        // Pulisci il carrello dal localStorage quando l'utente fa logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-storage')
        }
        set({ user: null, loginTimestamp: null })
      },
      isAuthenticated: () => {
        return get().user !== null
      },
      isAdmin: () => {
        const user = get().user
        return user?.role === 'admin' || user?.role === 'ADMIN'
      },
      setUser: (user: User | null) => {
        set({ user })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }),
    }
  )
)

