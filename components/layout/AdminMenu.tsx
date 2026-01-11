'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  FiMenu,
  FiX,
  FiChevronDown,
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiHome,
  FiPlus,
  FiLogOut,
  FiSettings,
  FiShield,
  FiGift,
  FiTag,
  FiFileText,
} from 'react-icons/fi'

export default function AdminMenu() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }

  if (!user || (user.role !== 'admin' && user.role !== 'ADMIN')) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition text-gray-700 bg-primary-50 border border-primary-200"
        aria-label="Menu admin"
      >
        <FiMenu className="w-6 h-6 text-primary-600" />
        <span className="hidden md:inline font-medium text-primary-700">Admin</span>
        <FiChevronDown className={`w-4 h-4 text-primary-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-primary-50">
            <p className="font-semibold text-gray-900">Area Amministratore</p>
            <p className="text-sm text-gray-600 truncate">{user.email}</p>
          </div>

          {/* Menu Items */}
          <nav className="py-2">
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiHome className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Dashboard</span>
                <p className="text-xs text-gray-500">Panoramica generale</p>
              </div>
            </Link>

            <Link
              href="/admin/prodotti"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiPackage className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Gestione Prodotti</span>
                <p className="text-xs text-gray-500">Aggiungi e modifica prodotti</p>
              </div>
            </Link>

            <Link
              href="/admin/prodotti/nuovo"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiPlus className="w-5 h-5 text-green-600" />
              <div>
                <span className="font-medium">Nuovo Prodotto</span>
                <p className="text-xs text-gray-500">Inserisci un nuovo prodotto</p>
              </div>
            </Link>

            <Link
              href="/admin/ordini"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiShoppingBag className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Gestione Ordini</span>
                <p className="text-xs text-gray-500">Visualizza e gestisci ordini</p>
              </div>
            </Link>

            <Link
              href="/admin/utenti"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiUsers className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Gestione Utenti</span>
                <p className="text-xs text-gray-500">Gestisci utenti e ruoli</p>
              </div>
            </Link>

            <Link
              href="/admin/categorie"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiTag className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Gestione Categorie</span>
                <p className="text-xs text-gray-500">Crea e gestisci categorie</p>
              </div>
            </Link>

            <Link
              href="/admin/stripe"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiShield className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Configurazione Stripe</span>
                <p className="text-xs text-gray-500">Gestisci pagamenti Stripe</p>
              </div>
            </Link>

            <Link
              href="/admin/spedizioni"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiPackage className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Impostazioni Spedizione</span>
                <p className="text-xs text-gray-500">Gestisci costi spedizione</p>
              </div>
            </Link>

            <Link
              href="/admin/profilo"
              onClick={async (e) => {
                setIsOpen(false)
                
                // Log del click sul link
                try {
                  await fetch('/api/logs/error', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      component: 'AdminMenu',
                      url: '/admin/profilo',
                      user: user?.id || null,
                      message: 'Click su Profilo Azienda dal menu',
                      timestamp: new Date().toISOString(),
                    }),
                  }).catch(() => {
                    // Ignora errori di logging
                  })
                } catch (error) {
                  // Ignora errori di logging
                }
              }}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiSettings className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Profilo Azienda</span>
                <p className="text-xs text-gray-500">Dati azienda per etichette</p>
              </div>
            </Link>

            <Link
              href="/admin/coupon"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiGift className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Generatore Coupon</span>
                <p className="text-xs text-gray-500">Genera e gestisci coupon sconto</p>
              </div>
            </Link>

            <Link
              href="/admin/footer"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 border-b border-gray-100"
            >
              <FiFileText className="w-5 h-5 text-primary-600" />
              <div>
                <span className="font-medium">Gestione Footer</span>
                <p className="text-xs text-gray-500">Chi Siamo, Spedizioni, FAQ</p>
              </div>
            </Link>
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700"
            >
              <FiHome className="w-5 h-5" />
              <span>Vai allo Store</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 transition text-red-600"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

