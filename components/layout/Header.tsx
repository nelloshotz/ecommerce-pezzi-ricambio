'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { FiShoppingCart, FiMenu, FiLogOut } from 'react-icons/fi'
import UserMenu from './UserMenu'
import AdminMenu from './AdminMenu'

export default function Header() {
  const router = useRouter()
  // Calcola direttamente il conteggio degli item invece di chiamare getItemCount()
  // Questo evita problemi con gli hook di React
  const itemCount = useCartStore(state => 
    state.items.reduce((count, item) => count + item.quantity, 0)
  )
  const { user, isAuthenticated, logout } = useAuthStore()
  const loadCartFromDB = useCartStore(state => state.loadCartFromDB)

  const clearCart = useCartStore(state => state.clearCart)
  const previousUserIdRef = useRef<string | null>(null)
  
  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }
  
  // Carica carrello dal database quando l'utente è loggato
  // Il carrello rimane nel database anche dopo il logout, quindi viene ricaricato al login
  // IMPORTANTE: Ogni utente vede solo il proprio carrello salvato nel database
  // Quando si cambia utente (userId cambia), pulisce il carrello locale e carica quello nuovo
  useEffect(() => {
    const currentUserId = user?.id || null
    const isUserAuthenticated = user !== null && user.id !== undefined
    
    // Se l'utente è cambiato (da un utente a un altro o da loggato a non loggato)
    if (previousUserIdRef.current !== currentUserId) {
      // Se c'era un utente precedente e ora c'è un utente diverso (cambio utente)
      if (previousUserIdRef.current && currentUserId && previousUserIdRef.current !== currentUserId) {
        // Cambio utente: pulisci il carrello locale prima di caricare quello nuovo
        // Questo garantisce che non venga mostrato il carrello del precedente utente
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-storage')
        }
        // Pulisci lo stato del carrello
        clearCart() // clearCart senza userId pulisce solo localmente, non dal database
      }
      
      // Aggiorna il riferimento all'utente corrente
      previousUserIdRef.current = currentUserId
      
      // Se l'utente è loggato, carica SEMPRE il carrello dal database
      // Questo garantisce che ogni utente veda solo il proprio carrello
      if (isUserAuthenticated && currentUserId) {
        loadCartFromDB(currentUserId)
      } else if (!currentUserId) {
        // Se l'utente è null (logout), pulisci solo il carrello locale
        // NON cancellare il carrello dal database - rimane associato all'utente
        // e verrà ricaricato quando l'utente farà login di nuovo
        clearCart() // clearCart senza userId pulisce solo localmente, non dal database
        // Rimuovi anche il localStorage per evitare che venga ri-idratato
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-storage')
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Solo user?.id come dipendenza - clearCart e loadCartFromDB sono funzioni stabili dello store

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Sinistra: Carrello - visibile solo se utente loggato */}
          {isAuthenticated() && (
            <div className="flex items-center">
              <Link 
                href="/carrello" 
                className="relative p-2 text-gray-700 hover:text-primary-600 transition"
              >
                <FiShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          )}
          {/* Spazio vuoto se utente non loggato per mantenere il layout */}
          {!isAuthenticated() && <div className="flex items-center w-10"></div>}

          {/* Centro: Logo - più piccolo su mobile, centrato */}
          <Link href="/" className="flex items-center h-8 md:h-12 absolute left-1/2 transform -translate-x-1/2">
            <Image
              src="/logo_images/logoheader.png"
              alt="MotorPlanet Logo"
              width={150}
              height={48}
              className="h-8 w-auto md:h-12 object-contain"
              priority
            />
          </Link>

          {/* Destra: Pulsanti Login/Menu */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Pulsante Logout sempre visibile per admin */}
            {(user?.role === 'admin' || user?.role === 'ADMIN') && (
              <button
                onClick={handleLogout}
                className="px-2 py-1.5 md:px-3 md:py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs md:text-sm flex items-center space-x-1"
                title="Logout"
              >
                <FiLogOut className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            {user ? (
              <div className="flex items-center space-x-2">
                {(user.role === 'admin' || user.role === 'ADMIN') ? (
                  <AdminMenu />
                ) : (
                  <UserMenu />
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-2 py-1.5 md:px-3 md:py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition text-xs md:text-sm whitespace-nowrap"
                title="Login"
              >
                Accedi
              </Link>
            )}
            {/* Burger menu - visibile solo se utente loggato */}
            {isAuthenticated() && (
              <button className="md:hidden p-2">
                <FiMenu className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

