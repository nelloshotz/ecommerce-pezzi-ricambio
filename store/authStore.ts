import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null // JWT token
  loginTimestamp: number | null // Timestamp del login (per logout automatico a mezzanotte)
  login: (email: string, password: string, userData?: User, token?: string) => Promise<boolean>
  logout: () => Promise<void>
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  setUser: (user: User | null) => void
  getToken: () => string | null
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loginTimestamp: null,
      login: async (email: string, password: string, userData?: User, token?: string) => {
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
          console.log('🔑 [AuthStore] === CREAZIONE SESSIONE ===')
          console.log('[AuthStore] Dati ricevuti per creazione sessione:', {
            userId: userData.id,
            email: userData.email,
            role: userData.role,
            hasToken: !!token,
            tokenLength: token?.length,
            tokenPrefix: token ? token.substring(0, 30) + '...' : null,
          })
          
          // PRIMA: Pulisci completamente il carrello locale del precedente utente
          await clearCartLocal()
          
          // POI: Salva i dati del nuovo utente e il token (questo triggererà il reload delle pagine)
          const loginTime = Date.now()
          console.log('💾 [AuthStore] Salvataggio dati sessione nello store Zustand...')
          console.log('[AuthStore] Dati da salvare:', {
            userId: userData.id,
            email: userData.email,
            hasToken: !!token,
            tokenLength: token?.length,
            loginTime: new Date(loginTime).toISOString(),
          })
          
          set({ user: userData, token: token || null, loginTimestamp: loginTime })
          
          console.log('✅ [AuthStore] Dati salvati nello store Zustand!')
          console.log('💾 [AuthStore] Verifica persistenza token nel localStorage...')
          
          // Attendi che il token sia persistito nel localStorage
          // Il middleware persist di Zustand potrebbe aver bisogno di tempo
          if (typeof window !== 'undefined' && token) {
            let persisted = false
            for (let i = 0; i < 50; i++) {
              await new Promise(resolve => setTimeout(resolve, 10))
              const authStorage = localStorage.getItem('auth-storage')
              if (authStorage) {
                try {
                  const parsed = JSON.parse(authStorage)
                  if (parsed?.state?.token === token) {
                    persisted = true
                    console.log(`✅ [AuthStore] Token persistito nel localStorage al tentativo ${i + 1}`)
                    console.log('[AuthStore] Verifica localStorage:', {
                      hasAuthStorage: !!authStorage,
                      hasTokenInStorage: !!parsed?.state?.token,
                      tokenMatch: parsed?.state?.token === token,
                      tokenLength: parsed?.state?.token?.length,
                    })
                    break
                  }
                } catch (e) {
                  // Ignora errori di parsing
                }
              }
            }
            if (!persisted) {
              console.warn('⚠️ [AuthStore] Token NON persistito nel localStorage dopo 50 tentativi')
            } else {
              console.log('✅ [AuthStore] === SESSIONE CREATA CON SUCCESSO ===')
              console.log('[AuthStore] Sessione attiva:', {
                userId: userData.id,
                email: userData.email,
                tokenPresente: true,
                tokenInLocalStorage: true,
              })
            }
          }
          
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
            console.log('🔑 [AuthStore] === CREAZIONE SESSIONE (via API) ===')
            console.log('[AuthStore] Dati ricevuti dall\'API:', {
              userId: data.user.id,
              email: data.user.email,
              role: data.user.role,
              hasToken: !!data.token,
              tokenLength: data.token?.length,
              tokenPrefix: data.token ? data.token.substring(0, 30) + '...' : null,
            })
            
            // PRIMA: Pulisci completamente il carrello locale del precedente utente
            await clearCartLocal()
            
            // POI: Salva i dati del nuovo utente e il token JWT (questo triggererà il reload delle pagine)
            const loginTime = Date.now()
            console.log('💾 [AuthStore] Salvataggio dati sessione nello store Zustand...')
            console.log('[AuthStore] Dati da salvare:', {
              userId: data.user.id,
              email: data.user.email,
              hasToken: !!data.token,
              tokenLength: data.token?.length,
              loginTime: new Date(loginTime).toISOString(),
            })
            
            set({ 
              user: data.user, 
              token: data.token || null, // Salva il token JWT
              loginTimestamp: loginTime 
            })
            
            console.log('✅ [AuthStore] Dati salvati nello store Zustand!')
            console.log('💾 [AuthStore] Verifica persistenza token nel localStorage...')
            
            // Attendi che il token sia persistito nel localStorage
            // Il middleware persist di Zustand potrebbe aver bisogno di tempo
            if (typeof window !== 'undefined' && data.token) {
              let persisted = false
              for (let i = 0; i < 50; i++) {
                await new Promise(resolve => setTimeout(resolve, 10))
                const authStorage = localStorage.getItem('auth-storage')
                if (authStorage) {
                  try {
                    const parsed = JSON.parse(authStorage)
                    if (parsed?.state?.token === data.token) {
                      persisted = true
                      console.log(`✅ [AuthStore] Token persistito nel localStorage al tentativo ${i + 1}`)
                      console.log('[AuthStore] Verifica localStorage:', {
                        hasAuthStorage: !!authStorage,
                        hasTokenInStorage: !!parsed?.state?.token,
                        tokenMatch: parsed?.state?.token === data.token,
                        tokenLength: parsed?.state?.token?.length,
                      })
                      break
                    }
                  } catch (e) {
                    // Ignora errori di parsing
                  }
                }
              }
              if (!persisted) {
                console.warn('⚠️ [AuthStore] Token NON persistito nel localStorage dopo 50 tentativi')
              } else {
                console.log('✅ [AuthStore] === SESSIONE CREATA CON SUCCESSO ===')
                console.log('[AuthStore] Sessione attiva:', {
                  userId: data.user.id,
                  email: data.user.email,
                  tokenPresente: true,
                  tokenInLocalStorage: true,
                })
              }
            }
            
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
        set({ user: null, token: null, loginTimestamp: null })
      },
      getToken: () => {
        return get().token
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

