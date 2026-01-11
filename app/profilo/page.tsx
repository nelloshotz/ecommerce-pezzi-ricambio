'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit, FiSave, FiX } from 'react-icons/fi'
import Link from 'next/link'

interface Address {
  id: string
  type: 'SHIPPING' | 'BILLING'
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  province?: string | null
  country: string
  isDefault: boolean
}

export default function ProfiloPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAddress, setEditingAddress] = useState<string | null>(null)
  const [editedAddress, setEditedAddress] = useState<Address | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    loadAddresses()
  }, [user])

  const loadAddresses = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/users/${user.id}/addresses`)
      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error('Errore nel caricamento indirizzi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address.id)
    setEditedAddress({ ...address })
  }

  const handleSaveAddress = async () => {
    if (!editedAddress) return

    try {
      const response = await fetch(`/api/addresses/${editedAddress.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedAddress),
      })

      if (response.ok) {
        await loadAddresses()
        setEditingAddress(null)
        setEditedAddress(null)
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      alert('Errore nel salvataggio dell\'indirizzo')
    }
  }

  const handleCancelEdit = () => {
    setEditingAddress(null)
    setEditedAddress(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Caricamento profilo...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const shippingAddress = addresses.find((a) => a.type === 'SHIPPING' && a.isDefault)
  const billingAddress = addresses.find((a) => a.type === 'BILLING' && a.isDefault)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Il Mio Profilo</h1>
        <p className="text-gray-600">Gestisci i tuoi dati personali e gli indirizzi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informazioni Account */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiUser className="mr-2" />
              Informazioni Account
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <p className="text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <FiMail className="mr-1 w-4 h-4" />
                  Email
                </label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              {user.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FiPhone className="mr-1 w-4 h-4" />
                    Telefono
                  </label>
                  <p className="text-gray-900">{user.phone}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo
                </label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'admin' || user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.role === 'admin' || user.role === 'ADMIN' ? 'Amministratore' : 'Cliente'}
                </span>
              </div>
              <div className="text-sm text-gray-500 pt-4 border-t">
                Membro dal {new Date(user.createdAt).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>

          {/* Indirizzo di Spedizione */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <FiMapPin className="mr-2" />
                Indirizzo di Spedizione
              </h2>
              {shippingAddress && !editingAddress && (
                <button
                  onClick={() => handleEditAddress(shippingAddress)}
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                >
                  <FiEdit className="w-4 h-4" />
                  <span>Modifica</span>
                </button>
              )}
            </div>

            {editingAddress === shippingAddress?.id && editedAddress ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.firstName}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cognome *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.lastName}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo *
                  </label>
                  <input
                    type="text"
                    value={editedAddress.address}
                    onChange={(e) =>
                      setEditedAddress({ ...editedAddress, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Città *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.city}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CAP *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.postalCode}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, postalCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={editedAddress.province || ''}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, province: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nazione *
                  </label>
                  <input
                    type="text"
                    value={editedAddress.country}
                    onChange={(e) =>
                      setEditedAddress({ ...editedAddress, country: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="flex items-center space-x-4 pt-4 border-t">
                  <button
                    onClick={handleSaveAddress}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    <FiSave className="w-4 h-4" />
                    <span>Salva</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <FiX className="w-4 h-4" />
                    <span>Annulla</span>
                  </button>
                </div>
              </div>
            ) : shippingAddress ? (
              <div className="space-y-2 text-gray-700">
                <p className="font-medium">
                  {shippingAddress.firstName} {shippingAddress.lastName}
                </p>
                <p>{shippingAddress.address}</p>
                <p>
                  {shippingAddress.postalCode} {shippingAddress.city}
                  {shippingAddress.province && ` (${shippingAddress.province})`}
                </p>
                <p>{shippingAddress.country}</p>
                <p className="pt-2 text-sm text-gray-600">
                  📧 {shippingAddress.email} | 📞 {shippingAddress.phone}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">Nessun indirizzo di spedizione salvato</p>
            )}
          </div>

          {/* Indirizzo di Fatturazione */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <FiMapPin className="mr-2" />
                Indirizzo di Fatturazione
              </h2>
              {billingAddress && !editingAddress && (
                <button
                  onClick={() => handleEditAddress(billingAddress)}
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                >
                  <FiEdit className="w-4 h-4" />
                  <span>Modifica</span>
                </button>
              )}
            </div>

            {editingAddress === billingAddress?.id && editedAddress ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.firstName}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cognome *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.lastName}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo *
                  </label>
                  <input
                    type="text"
                    value={editedAddress.address}
                    onChange={(e) =>
                      setEditedAddress({ ...editedAddress, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Città *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.city}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CAP *
                    </label>
                    <input
                      type="text"
                      value={editedAddress.postalCode}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, postalCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={editedAddress.province || ''}
                      onChange={(e) =>
                        setEditedAddress({ ...editedAddress, province: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4 pt-4 border-t">
                  <button
                    onClick={handleSaveAddress}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    <FiSave className="w-4 h-4" />
                    <span>Salva</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <FiX className="w-4 h-4" />
                    <span>Annulla</span>
                  </button>
                </div>
              </div>
            ) : billingAddress ? (
              <div className="space-y-2 text-gray-700">
                <p className="font-medium">
                  {billingAddress.firstName} {billingAddress.lastName}
                </p>
                <p>{billingAddress.address}</p>
                <p>
                  {billingAddress.postalCode} {billingAddress.city}
                  {billingAddress.province && ` (${billingAddress.province})`}
                </p>
                <p>{billingAddress.country}</p>
                <p className="pt-2 text-sm text-gray-600">
                  📧 {billingAddress.email} | 📞 {billingAddress.phone}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">Nessun indirizzo di fatturazione salvato</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4">Link Rapidi</h3>
            <div className="space-y-2">
              <Link
                href="/ordini"
                className="block text-primary-600 hover:text-primary-700 font-medium"
              >
                → I Miei Ordini
              </Link>
              <Link
                href="/carrello"
                className="block text-primary-600 hover:text-primary-700 font-medium"
              >
                → Il Mio Carrello
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

