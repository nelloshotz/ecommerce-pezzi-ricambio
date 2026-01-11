'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { FiSave, FiBriefcase, FiAlertCircle, FiCheckCircle, FiMail, FiPhone, FiMapPin, FiGlobe } from 'react-icons/fi'

interface CompanySettings {
  companyName: string
  vatNumber?: string | null
  taxCode?: string | null
  address: string
  city: string
  postalCode: string
  province?: string | null
  country: string
  phone: string
  email: string
  website?: string | null
  notes?: string | null
}

export default function AdminProfiloPage() {
  const { user } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  const [formData, setFormData] = useState<CompanySettings>({
    companyName: '',
    vatNumber: '',
    taxCode: '',
    address: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'Italia',
    phone: '',
    email: '',
    website: '',
    notes: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Attendi che lo store sia idratato
  useEffect(() => {
    try {
      setIsHydrated(true)
      
      // Log del rendering del componente
      fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'AdminProfiloPage',
          url: '/admin/profilo',
          user: user?.id || null,
          message: 'Componente AdminProfiloPage renderizzato',
          timestamp: new Date().toISOString(),
          additionalInfo: {
            userRole: user?.role || null,
            window: typeof window !== 'undefined',
          },
        }),
      }).catch(() => {
        // Ignora errori di logging
      })
    } catch (err: any) {
      // Log dell'errore in modo sincrono
      fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'AdminProfiloPage',
          url: '/admin/profilo',
          user: user?.id || null,
          error: err?.message || String(err),
          stack: err?.stack || null,
          message: 'Errore nell\'idratazione del componente',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        console.error('Errore nel logging:', err)
      })
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    async function loadCompanySettings() {
      if (!isHydrated || !user?.id) return

      try {
        setLoading(true)
        const response = await fetch('/api/admin/company/settings', {
          headers: {
            'x-user-id': user.id,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          const error = new Error(`HTTP ${response.status}: ${errorText}`)
          
          // Log dell'errore
          fetch('/api/logs/error', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              component: 'AdminProfiloPage',
              url: '/admin/profilo',
              user: user?.id || null,
              error: error.message,
              stack: error.stack || null,
              message: 'Errore nel caricamento dati azienda da API',
              timestamp: new Date().toISOString(),
              additionalInfo: {
                status: response.status,
                statusText: response.statusText,
              },
            }),
          }).catch(() => {
            // Ignora errori di logging
          })
          
          throw error
        }

        const data: CompanySettings = await response.json()
        if (data.companyName) {
          setFormData(data)
        }
      } catch (err: any) {
        console.error('Errore nel caricamento dati azienda:', err)
        setError(err.message || 'Errore nel caricamento dati azienda')
        
        // Log dell'errore
        fetch('/api/logs/error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            component: 'AdminProfiloPage',
            url: '/admin/profilo',
            user: user?.id || null,
            error: err?.message || String(err),
            stack: err?.stack || null,
            message: 'Errore nel caricamento dati azienda',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Ignora errori di logging
        })
      } finally {
        setLoading(false)
      }
    }

    if (isHydrated && user?.id) {
      loadCompanySettings()
    }
  }, [user?.id, isHydrated])

  // Verifica che tutti i componenti siano importati correttamente (prima dei return)
  useEffect(() => {
    try {
      // Verifica che tutte le icone siano importate correttamente
      const iconCheck = {
        FiSave: typeof FiSave !== 'undefined',
        FiBriefcase: typeof FiBriefcase !== 'undefined',
        FiAlertCircle: typeof FiAlertCircle !== 'undefined',
        FiCheckCircle: typeof FiCheckCircle !== 'undefined',
        FiMail: typeof FiMail !== 'undefined',
        FiPhone: typeof FiPhone !== 'undefined',
        FiMapPin: typeof FiMapPin !== 'undefined',
        FiGlobe: typeof FiGlobe !== 'undefined',
      }
      
      const undefinedIcons = Object.entries(iconCheck)
        .filter(([_, exists]) => !exists)
        .map(([name]) => name)
      
      if (undefinedIcons.length > 0) {
        fetch('/api/logs/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component: 'AdminProfiloPage',
            url: '/admin/profilo',
            user: user?.id || null,
            error: `Icone non definite: ${undefinedIcons.join(', ')}`,
            message: 'Problema con import icone',
            timestamp: new Date().toISOString(),
            additionalInfo: iconCheck,
          }),
        }).catch(() => {})
      }
    } catch (err: any) {
      fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: 'AdminProfiloPage',
          url: '/admin/profilo',
          user: user?.id || null,
          error: err?.message || String(err),
          stack: err?.stack || null,
          message: 'Errore nel check componenti',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {})
    }
  }, [user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/company/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nel salvataggio dati azienda')
      }

      setSuccess('Dati azienda salvati con successo!')
      setFormData(data)
    } catch (err: any) {
      console.error('Errore nel salvataggio:', err)
      setError(err.message || 'Errore nel salvataggio dati azienda')
      
      // Log dell'errore
      fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'AdminProfiloPage',
          url: '/admin/profilo',
          user: user?.id || null,
          error: err?.message || String(err),
          stack: err?.stack || null,
          message: 'Errore nel salvataggio dati azienda',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Ignora errori di logging
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento...</p>
      </div>
    )
  }

  // Non renderizzare se l'utente non è disponibile (il layout admin gestisce il redirect)
  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Caricamento dati azienda...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FiBriefcase className="mr-3" /> Profilo Azienda
      </h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <FiAlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Dati Azienda per Etichette Spedizione</p>
            <p>
              Questi dati verranno utilizzati per generare le etichette di spedizione. Assicurati che siano corretti e completi.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <FiAlertCircle className="inline mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <FiCheckCircle className="inline mr-2" />
          <span className="block sm:inline">{success}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Azienda */}
            <div className="md:col-span-2">
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Azienda <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="MotorPlanet S.r.l."
                  required
                />
              </div>
            </div>

            {/* Partita IVA */}
            <div>
              <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Partita IVA
              </label>
              <input
                type="text"
                id="vatNumber"
                value={formData.vatNumber || ''}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="IT12345678901"
              />
            </div>

            {/* Codice Fiscale */}
            <div>
              <label htmlFor="taxCode" className="block text-sm font-medium text-gray-700 mb-2">
                Codice Fiscale
              </label>
              <input
                type="text"
                id="taxCode"
                value={formData.taxCode || ''}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ABCDEF12G34H567I"
              />
            </div>

            {/* Indirizzo */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Indirizzo Sede <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Via Roma 123"
                  required
                />
              </div>
            </div>

            {/* Città */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                Città <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Roma"
                required
              />
            </div>

            {/* CAP */}
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                CAP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="00100"
                required
              />
            </div>

            {/* Provincia */}
            <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                Provincia
              </label>
              <input
                type="text"
                id="province"
                value={formData.province || ''}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="RM"
                maxLength={2}
              />
            </div>

            {/* Nazione */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Nazione <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Italia"
                required
              />
            </div>

            {/* Telefono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefono <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+39 06 12345678"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="info@motorplanet.it"
                  required
                />
              </div>
            </div>

            {/* Sito Web */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Sito Web
              </label>
              <div className="relative">
                <FiGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="url"
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://www.motorplanet.it"
                />
              </div>
            </div>

            {/* Note */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Note Aggiuntive (per etichette)
              </label>
              <textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="Note aggiuntive che appariranno sulle etichette di spedizione..."
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4" />
              <span>{saving ? 'Salvataggio...' : 'Salva Dati Azienda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

