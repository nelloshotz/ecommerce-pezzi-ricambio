import { useAuthStore } from '@/store/authStore'

/**
 * Utility per fare richieste fetch con autenticazione JWT automatica
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ottieni il token dallo store
  const token = useAuthStore.getState().token

  // Prepara gli header
  const headers = new Headers(options.headers)

  // Aggiungi il token JWT se disponibile
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Rimuovi x-user-id se presente (non più necessario)
  headers.delete('x-user-id')

  // Esegui la richiesta con gli header aggiornati
  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Helper per ottenere gli header di autenticazione
 * Attende che lo store sia ri-idratato se necessario
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  console.log('[getAuthHeaders] Inizio recupero header autenticazione...')
  
  // PRIMA: Prova a leggere direttamente dal localStorage (più affidabile)
  if (typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      console.log('[getAuthHeaders] Lettura localStorage:', {
        hasAuthStorage: !!authStorage,
      })
      
      if (authStorage) {
        const parsed = JSON.parse(authStorage)
        const tokenFromStorage = parsed?.state?.token
        console.log('[getAuthHeaders] Token dal localStorage:', {
          hasToken: !!tokenFromStorage,
          tokenLength: tokenFromStorage?.length,
          tokenPrefix: tokenFromStorage ? tokenFromStorage.substring(0, 30) + '...' : null,
        })
        
        if (tokenFromStorage) {
          const headers = {
            'Authorization': `Bearer ${tokenFromStorage}`
          }
          console.log('[getAuthHeaders] ✅ Header creato da localStorage:', {
            hasAuthorization: !!headers['Authorization'],
            authorizationLength: headers['Authorization'].length,
          })
          return headers
        }
      }
    } catch (error) {
      console.error('[getAuthHeaders] Errore lettura localStorage:', error)
    }
  }

  // SECONDA: Prova a leggere dallo store Zustand
  let token = useAuthStore.getState().token
  console.log('[getAuthHeaders] Token dallo store Zustand:', {
    hasToken: !!token,
    tokenLength: token?.length,
  })
  
  if (token) {
    const headers = {
      'Authorization': `Bearer ${token}`
    }
    console.log('[getAuthHeaders] ✅ Header creato da store Zustand:', {
      hasAuthorization: !!headers['Authorization'],
    })
    return headers
  }

  // TERZA: Attendi che lo store sia ri-idratato e riprova
  if (typeof window !== 'undefined') {
    console.log('[getAuthHeaders] Token non trovato, attesa ri-idratazione store...')
    let attempts = 0
    const maxAttempts = 100 // Massimo 1 secondo di attesa (100 * 10ms)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10))
      attempts++
      
      // Prova store
      token = useAuthStore.getState().token
      if (token) {
        const headers = {
          'Authorization': `Bearer ${token}`
        }
        console.log(`[getAuthHeaders] ✅ Header creato da store dopo ${attempts} tentativi`)
        return headers
      }
      
      // Prova localStorage ad ogni tentativo
      try {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const parsed = JSON.parse(authStorage)
          const tokenFromStorage = parsed?.state?.token
          if (tokenFromStorage) {
            const headers = {
              'Authorization': `Bearer ${tokenFromStorage}`
            }
            console.log(`[getAuthHeaders] ✅ Header creato da localStorage dopo ${attempts} tentativi`)
            return headers
          }
        }
      } catch (error) {
        // Ignora errori
      }
    }
  }
  
  // Se dopo tutti i tentativi il token non è disponibile
  console.warn('[getAuthHeaders] ⚠️ Token non trovato dopo tutti i tentativi')
  const headers: Record<string, string> = {}
  
  // Ultimo tentativo: rileggi dallo store
  token = useAuthStore.getState().token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('[getAuthHeaders] ✅ Header creato da store (ultimo tentativo)')
  } else {
    console.warn('[getAuthHeaders] ⚠️ Nessun token disponibile, header vuoto')
  }

  return headers
}

