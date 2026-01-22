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
 */
export function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

