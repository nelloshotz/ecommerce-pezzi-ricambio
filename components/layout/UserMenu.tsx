'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import {
  FiUser,
  FiShoppingBag,
  FiShoppingCart,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronDown,
} from 'react-icons/fi'

export default function UserMenu() {
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

  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
        aria-label="Menu utente"
      >
        <FiMenu className="w-6 h-6" />
        <span className="hidden md:inline font-medium">{user.name}</span>
        <FiChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600 truncate">{user.email}</p>
            {user.role === 'admin' || user.role === 'ADMIN' ? (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                Admin
              </span>
            ) : null}
          </div>

          {/* Menu Items */}
          <nav className="py-2">
            <Link
              href="/profilo"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700"
            >
              <FiUser className="w-5 h-5" />
              <span>Il Mio Profilo</span>
            </Link>

            <Link
              href="/ordini"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700"
            >
              <FiShoppingBag className="w-5 h-5" />
              <span>I Miei Ordini</span>
            </Link>

            <Link
              href="/carrello"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700"
            >
              <FiShoppingCart className="w-5 h-5" />
              <span>Il Mio Carrello</span>
            </Link>

            {user.role === 'admin' || user.role === 'ADMIN' ? (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition text-gray-700 border-t border-gray-200 mt-2 pt-2"
              >
                <FiUser className="w-5 h-5" />
                <span>Area Admin</span>
              </Link>
            ) : null}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 pt-2 mt-2">
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

