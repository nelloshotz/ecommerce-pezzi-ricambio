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
  // Attendi che lo store sia ri-idratato dal localStorage
  // Zustand persist ha bisogno di tempo per ri-idratare lo store dopo il refresh
  let attempts = 0
  const maxAttempts = 50 // Massimo 500ms di attesa (50 * 10ms)
  
  while (attempts < maxAttempts) {
    const token = useAuthStore.getState().token
    
    // Se il token è disponibile, possiamo procedere
    if (token) {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      }
      return headers
    }
    
    // Se siamo nel browser e lo store non è ancora ri-idratato, attendi
    if (typeof window !== 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 10))
      attempts++
    } else {
      // Su server-side, non c'è localStorage, quindi esci subito
      break
    }
  }
  
  // Se dopo tutti i tentativi il token non è disponibile, restituisci header vuoto
  // Il controllo nel cartStore verificherà e reindirizzerà al login
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {}
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

