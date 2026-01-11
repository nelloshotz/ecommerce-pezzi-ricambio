'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { 
  FiPackage, 
  FiShoppingBag, 
  FiUsers, 
  FiHome,
  FiLogOut,
  FiSettings,
  FiTag
} from 'react-icons/fi'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAdmin, logout } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  // Attendi che lo store sia idratato da localStorage prima di verificare l'autenticazione
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Non fare redirect finché lo store non è idratato
    if (!isHydrated) {
      return
    }

    if (!user || !isAdmin()) {
      router.push('/login')
    }
  }, [user, isAdmin, router, isHydrated])

  // Mostra loading durante l'idratazione
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    )
  }

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Accesso negato. Reindirizzamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <Link href="/admin" className="text-xl font-bold text-primary-600 flex-shrink-0">
                MotorPlanet Admin
              </Link>
              <div className="hidden md:flex space-x-4 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
                <div className="flex space-x-4 flex-shrink-0">
                  <Link
                    href="/admin"
                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    <FiHome className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/admin/prodotti"
                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    <FiPackage className="w-5 h-5" />
                    <span>Prodotti</span>
                  </Link>
                  <Link
                    href="/admin/ordini"
                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    <FiShoppingBag className="w-5 h-5" />
                    <span>Ordini</span>
                  </Link>
                  <Link
                    href="/admin/utenti"
                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    <FiUsers className="w-5 h-5" />
                    <span>Utenti</span>
                  </Link>
                  <Link
                    href="/admin/categorie"
                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-100 transition whitespace-nowrap"
                  >
                    <FiTag className="w-5 h-5" />
                    <span>Categorie</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
              <Link
                href="/"
                className="text-gray-700 hover:text-primary-600 transition text-sm whitespace-nowrap"
              >
                Vai allo Store
              </Link>
              <button
                onClick={async () => {
                  await logout()
                  router.push('/')
                }}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-red-600 transition whitespace-nowrap"
              >
                <FiLogOut className="w-5 h-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

