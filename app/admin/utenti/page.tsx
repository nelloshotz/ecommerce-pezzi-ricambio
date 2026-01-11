'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { User } from '@/types'
import { FiSearch, FiEdit, FiTrash2, FiUserPlus, FiX, FiCheck, FiUsers, FiMail, FiPhone, FiShield, FiUser, FiHome } from 'react-icons/fi'
import Link from 'next/link'

export default function AdminUtentiPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'CUSTOMER'>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Verifica autenticazione e ruolo admin
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'admin') {
      router.push('/')
      return
    }

    loadUsers()
  }, [currentUser, isAuthenticated, router])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        headers: {
          'x-user-id': currentUser?.id || '',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento utenti')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error)
      alert('Errore nel caricamento utenti')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        searchQuery === '' ||
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower) ||
        (user as any).companyName?.toLowerCase().includes(searchLower) ||
        (user as any).companyTaxCode?.toLowerCase().includes(searchLower) ||
        (user as any).companyAddress?.toLowerCase().includes(searchLower) ||
        (user as any).companyPec?.toLowerCase().includes(searchLower)

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('Non puoi eliminare il tuo stesso account')
      return
    }

    if (!confirm('Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || '',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'eliminazione utente')
      }

      // Ricarica lista utenti
      await loadUsers()
      setDeleteConfirm(null)
      alert('Utente eliminato con successo')
    } catch (error: any) {
      console.error('Errore nell\'eliminazione utente:', error)
      alert(error.message || 'Errore nell\'eliminazione utente')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'CUSTOMER') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nell\'aggiornamento ruolo')
      }

      // Ricarica lista utenti
      await loadUsers()
      alert('Ruolo utente aggiornato con successo')
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento ruolo:', error)
      alert(error.message || 'Errore nell\'aggiornamento ruolo')
    }
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN' || u.role === 'admin').length
  const customerCount = users.filter((u) => u.role === 'CUSTOMER' || u.role === 'customer').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento utenti...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestione Utenti</h1>
          <p className="text-gray-600">Gestisci utenti registrati e loro ruoli</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <FiUserPlus className="w-5 h-5" />
          <span>Nuovo Utente</span>
        </button>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale Utenti</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <FiUsers className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Amministratori</p>
              <p className="text-2xl font-bold">{adminCount}</p>
            </div>
            <FiShield className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clienti</p>
              <p className="text-2xl font-bold">{customerCount}</p>
            </div>
            <FiUsers className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filtri e Ricerca */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca utente (nome, email, telefono, ragione sociale, P.IVA, PEC)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'ADMIN' | 'CUSTOMER')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tutti i ruoli</option>
              <option value="ADMIN">Solo Amministratori</option>
              <option value="CUSTOMER">Solo Clienti</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-4">
          <span>Totale: {users.length}</span>
          <span>Amministratori: {adminCount}</span>
          <span>Clienti: {customerCount}</span>
          <span>Risultati: {filteredUsers.length}</span>
        </div>
      </div>

      {/* Lista Utenti */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Nessun utente trovato
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userType = (user as any).userType || 'PRIVATE'
                  const isCompany = userType === 'COMPANY'
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <FiUser className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            {isCompany && (user as any).companyName && (
                              <div className="text-xs text-gray-500">{(user as any).companyName}</div>
                            )}
                            <div className="text-sm text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <FiMail className="w-4 h-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.phone ? (
                          <div className="flex items-center">
                            <FiPhone className="w-4 h-4 mr-2 text-gray-400" />
                            {user.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isCompany
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {isCompany ? (
                            <>
                              <FiHome className="w-3 h-3 mr-1" />
                              Azienda
                            </>
                          ) : (
                            <>
                              <FiUser className="w-3 h-3 mr-1" />
                              Privato
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN' || user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.role === 'ADMIN' || user.role === 'admin' ? (
                            <>
                              <FiShield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <FiUsers className="w-3 h-3 mr-1" />
                              Cliente
                            </>
                          )}
                        </span>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() =>
                              handleUpdateRole(
                                user.id,
                                (user.role === 'ADMIN' || user.role === 'admin') ? 'CUSTOMER' : 'ADMIN'
                              )
                            }
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            title={`Cambia ruolo in ${(user.role === 'ADMIN' || user.role === 'admin') ? 'Cliente' : 'Admin'}`}
                          >
                            Cambia
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('it-IT', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/utenti/${user.id}`}
                          className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                          title="Visualizza dettaglio"
                        >
                          <FiEdit className="w-4 h-4" />
                          <span>Dettaglio</span>
                        </Link>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              if (deleteConfirm === user.id) {
                                handleDeleteUser(user.id)
                              } else {
                                setDeleteConfirm(user.id)
                              }
                            }}
                            className={`flex items-center space-x-1 ${
                              deleteConfirm === user.id
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-red-400 hover:text-red-600'
                            }`}
                            title={deleteConfirm === user.id ? 'Conferma eliminazione' : 'Elimina utente'}
                          >
                            {deleteConfirm === user.id ? (
                              <>
                                <FiCheck className="w-4 h-4" />
                                <span>Conferma</span>
                              </>
                            ) : (
                              <>
                                <FiTrash2 className="w-4 h-4" />
                                <span>Elimina</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Creazione Utente */}
      {showCreateForm && (
        <CreateUserForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            loadUsers()
          }}
          currentUserId={currentUser?.id || ''}
        />
      )}
    </div>
  )
}

// Componente Form Creazione Utente
interface CreateUserFormProps {
  onClose: () => void
  onSuccess: () => void
  currentUserId: string
}

function CreateUserForm({ onClose, onSuccess, currentUserId }: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'CUSTOMER' as 'ADMIN' | 'CUSTOMER',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nella creazione utente')
      }

      alert('Utente creato con successo!')
      onSuccess()
    } catch (error: any) {
      console.error('Errore nella creazione utente:', error)
      setError(error.message || 'Errore nella creazione utente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Nuovo Utente</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Minimo 6 caratteri</p>
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
            >
              <option value="CUSTOMER">Cliente</option>
              <option value="ADMIN">Amministratore</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creazione...' : 'Crea Utente'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
