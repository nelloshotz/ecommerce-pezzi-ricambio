'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { FiArrowLeft, FiSave, FiX, FiUser, FiMail, FiPhone, FiShield, FiPackage, FiDollarSign, FiCalendar, FiUserX, FiCheckCircle, FiAlertCircle, FiTrash2, FiUnlock } from 'react-icons/fi'
import Link from 'next/link'

interface UserDetail {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  banned: boolean
  bannedAt: string | null
  bannedBy: string | null
  bannedReason: string | null
  addresses: Array<{
    id: string
    type: string
    firstName: string
    lastName: string
    city: string
    country: string
    isDefault: boolean
    createdAt: string
  }>
  statistics: {
    ordersCount: number
    cartItemsCount: number
    reviewsCount: number
    totalSpent: number
    pendingOrders: number
    completedOrders: number
  }
  createdAt: string
  updatedAt: string
}

export default function AdminUtenteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user: currentUser, isAuthenticated } = useAuthStore()
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CUSTOMER' as 'ADMIN' | 'CUSTOMER',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [banning, setBanning] = useState(false)
  const [unbanning, setUnbanning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'admin') {
      router.push('/')
      return
    }

    loadUserDetail()
  }, [params.id, currentUser, isAuthenticated, router])

  const loadUserDetail = async () => {
    if (!params.id || typeof params.id !== 'string') return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${params.id}`, {
        headers: {
          'x-user-id': currentUser?.id || '',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento utente')
      }

      const data = await response.json()
      setUserDetail(data.user)
      setFormData({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || '',
        role: data.user.role,
        password: '',
      })
    } catch (error) {
      console.error('Errore nel caricamento utente:', error)
      alert('Errore nel caricamento utente')
      router.push('/admin/utenti')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!params.id || typeof params.id !== 'string' || !currentUser?.id) return

    setSaving(true)
    setError('')

    try {
      const updatePayload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
      }

      // Includi password solo se è stata modificata
      if (formData.password && formData.password.trim() !== '') {
        if (formData.password.length < 6) {
          setError('La password deve essere di almeno 6 caratteri')
          setSaving(false)
          return
        }
        updatePayload.password = formData.password
      }

      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento utente')
      }

      // Ricarica dati utente
      await loadUserDetail()
      // Reset password ma mantieni gli altri campi
      setFormData(prev => ({ ...prev, password: '' }))
      alert('Utente aggiornato con successo!')
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento utente:', error)
      setError(error.message || 'Errore nell\'aggiornamento utente')
    } finally {
      setSaving(false)
    }
  }

  const handleBan = async () => {
    if (!params.id || typeof params.id !== 'string' || !currentUser?.id || !userDetail) return

    if (params.id === currentUser.id) {
      alert('Non puoi bannare il tuo stesso account')
      return
    }

    if (userDetail.banned) {
      alert('L\'utente è già bannato')
      return
    }

    const confirmMessage = 'Sei sicuro di voler bannare questo utente? L\'utente non potrà più effettuare ordini né registrarsi nuovamente con questa email.'

    if (!confirm(confirmMessage)) {
      return
    }

    setBanning(true)
    setError('')

    try {
      const reason = prompt('Motivo del ban (opzionale):') || null

      const response = await fetch(`/api/admin/users/${params.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel ban utente')
      }

      // Ricarica dati utente
      await loadUserDetail()
      alert('Utente bannato con successo!')
    } catch (error: any) {
      console.error('Errore nel ban utente:', error)
      setError(error.message || 'Errore nel ban utente')
    } finally {
      setBanning(false)
    }
  }

  const handleUnban = async () => {
    if (!params.id || typeof params.id !== 'string' || !currentUser?.id || !userDetail) return

    if (!userDetail.banned) {
      alert('L\'utente non è bannato')
      return
    }

    const confirmMessage = 'Sei sicuro di voler sbannare questo utente? L\'utente potrà tornare a utilizzare il sistema normalmente.'

    if (!confirm(confirmMessage)) {
      return
    }

    setUnbanning(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/users/${params.id}/ban`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nello sban utente')
      }

      // Ricarica dati utente
      await loadUserDetail()
      alert('Utente sbannato con successo!')
    } catch (error: any) {
      console.error('Errore nello sban utente:', error)
      setError(error.message || 'Errore nello sban utente')
    } finally {
      setUnbanning(false)
    }
  }

  const handleDelete = async () => {
    if (!params.id || typeof params.id !== 'string' || !currentUser?.id || !userDetail) return

    if (params.id === currentUser.id) {
      alert('Non puoi eliminare il tuo stesso account')
      return
    }

    const confirmMessage = `Sei sicuro di voler ELIMINARE definitivamente questo utente?\n\nQuesta azione è IRREVERSIBILE e eliminerà:\n- Tutti gli ordini dell'utente\n- Tutti gli indirizzi\n- Il carrello\n- Le recensioni\n- Tutti i dati associati\n\nL'email potrà essere utilizzata per una nuova registrazione.`

    if (!confirm(confirmMessage)) {
      return
    }

    // Doppia conferma per sicurezza
    const doubleConfirm = prompt('Digita "ELIMINA" per confermare l\'eliminazione definitiva:')
    if (doubleConfirm !== 'ELIMINA') {
      alert('Eliminazione annullata')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'eliminazione utente')
      }

      alert('Utente eliminato con successo!')
      router.push('/admin/utenti')
    } catch (error: any) {
      console.error('Errore nell\'eliminazione utente:', error)
      setError(error.message || 'Errore nell\'eliminazione utente')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento utente...</p>
      </div>
    )
  }

  if (!userDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Utente non trovato</p>
        <Link
          href="/admin/utenti"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Torna alla lista utenti
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/utenti"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-2">Dettaglio Utente</h1>
            <p className="text-gray-600">{userDetail.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informazioni Utente */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dati Account */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiUser className="mr-2" />
              Informazioni Account
            </h2>

            <div className="space-y-4">
              {/* Stato Bannato */}
              {userDetail.banned && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiUserX className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-red-900">Utente Bannato</p>
                        {userDetail.bannedAt && (
                          <p className="text-sm text-red-700">
                            Bannato il: {new Date(userDetail.bannedAt).toLocaleDateString('it-IT')}
                          </p>
                        )}
                        {userDetail.bannedReason && (
                          <p className="text-sm text-red-700 mt-1">
                            Motivo: {userDetail.bannedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'CUSTOMER' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={params.id === currentUser?.id}
                >
                  <option value="CUSTOMER">Cliente</option>
                  <option value="ADMIN">Amministratore</option>
                </select>
                {params.id === currentUser?.id && (
                  <p className="text-xs text-gray-500 mt-1">Non puoi modificare il tuo stesso ruolo</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuova Password (lascia vuoto per non modificare)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Minimo 6 caratteri"
                />
                <p className="text-xs text-gray-500 mt-1">Lascia vuoto per mantenere la password attuale</p>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Indirizzi */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Indirizzi</h2>
            {userDetail.addresses && userDetail.addresses.length > 0 ? (
              <div className="space-y-3">
                {/* Filtra duplicati per ID */}
                {Array.from(
                  new Map(userDetail.addresses.map((addr) => [addr.id, addr])).values()
                ).map((address) => (
                  <div key={address.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {address.type === 'SHIPPING' ? 'Spedizione' : 'Fatturazione'}
                      </span>
                      {address.isDefault && (
                        <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.firstName} {address.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {address.city}, {address.country}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Nessun indirizzo salvato</p>
            )}
          </div>
        </div>

        {/* Sidebar Statistiche */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Statistiche</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">Ordini Totali</span>
                </div>
                <span className="font-bold">{userDetail.statistics.ordersCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiDollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">Totale Speso</span>
                </div>
                <span className="font-bold">€{userDetail.statistics.totalSpent.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-gray-600">Ordini in Attesa</span>
                </div>
                <span className="font-bold">{userDetail.statistics.pendingOrders}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">Ordini Completati</span>
                </div>
                <span className="font-bold">{userDetail.statistics.completedOrders}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Prodotti nel Carrello</span>
                </div>
                <span className="font-bold">{userDetail.statistics.cartItemsCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-gray-600">Recensioni</span>
                </div>
                <span className="font-bold">{userDetail.statistics.reviewsCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
            <div className="space-y-2">
              <Link
                href={`/admin/ordini?userId=${userDetail.id}`}
                className="block w-full text-left px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Visualizza Ordini Utente
              </Link>
              
              {/* Pulsante Ban */}
              {params.id !== currentUser?.id && !userDetail.banned && (
                <button
                  onClick={handleBan}
                  disabled={banning}
                  className="w-full text-left px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 bg-red-50 border border-red-300 text-red-800 hover:bg-red-100"
                >
                  <FiUserX className="w-5 h-5" />
                  <span>{banning ? 'Ban in corso...' : 'Banna Utente'}</span>
                </button>
              )}

              {/* Pulsante Unban */}
              {params.id !== currentUser?.id && userDetail.banned && (
                <button
                  onClick={handleUnban}
                  disabled={unbanning}
                  className="w-full text-left px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 bg-green-50 border border-green-300 text-green-800 hover:bg-green-100"
                >
                  <FiUnlock className="w-5 h-5" />
                  <span>{unbanning ? 'Unban in corso...' : 'Unban Utente'}</span>
                </button>
              )}

              {params.id === currentUser?.id && (
                <p className="text-xs text-gray-500 text-center py-2">
                  Non puoi bannare o eliminare il tuo stesso account
                </p>
              )}

              {/* Separatore */}
              {params.id !== currentUser?.id && (
                <div className="border-t border-gray-200 my-2"></div>
              )}

              {/* Pulsante Elimina Utente */}
              {params.id !== currentUser?.id && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full text-left px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 bg-red-600 text-white hover:bg-red-700"
                >
                  <FiTrash2 className="w-5 h-5" />
                  <span>{deleting ? 'Eliminazione...' : 'Elimina Utente'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

